# Deploying RecipyAI on a single Ubuntu server

This guide gets RecipyAI running on a single Ubuntu 22.04 / 24.04 VPS (Hetzner, DigitalOcean, EC2, Linode, etc.) with HTTPS, behind a real domain.

## Architecture

```
                            Internet
                               │
                               ▼
                       ┌───────────────┐
                       │  nginx (host) │   ← TLS, static frontend, reverse proxy
                       └───────┬───────┘
                               │
       ┌───────────────────────┴────────────────┐
       │                                        │
   /  →  /opt/recipyai/recipieaii/dist     /api/* → http://127.0.0.1:8000
                                                  │
                                                  ▼
                                       ┌─────────────────────┐
                                       │  Docker Compose     │
                                       │  (backend/)         │
                                       │  ─ api (uvicorn)    │
                                       │  ─ worker (arq)     │
                                       │  ─ postgres         │
                                       │  ─ redis            │
                                       └─────────────────────┘
```

The backend stays in Docker (clean isolation, easy upgrades). The frontend is a built static bundle served straight from disk by host-installed nginx, which also reverse-proxies `/api/*` to the API container exposed on `127.0.0.1:8000`.

## 1. Prerequisites on the server

```bash
ssh root@your-server
```

Create a non-root user (skip if you already have one):

```bash
adduser deploy
usermod -aG sudo deploy
rsync -a ~/.ssh /home/deploy/
chown -R deploy:deploy /home/deploy/.ssh
su - deploy
```

Install Docker, Compose plugin, nginx, certbot, git, and Node:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git nginx
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Logout and back in for the docker group to apply, OR:
newgrp docker
# Node 20 (for `npm run build`)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
```

Open the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Clone the project

```bash
sudo mkdir -p /opt/recipyai
sudo chown $USER:$USER /opt/recipyai
git clone https://github.com/sharjeelz/recipieAI.git /opt/recipyai
cd /opt/recipyai
```

## 3. Backend `.env` (production values)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```dotenv
ENV=production
LOG_LEVEL=INFO

# Whitelist your real domain (no trailing slash; comma-separated for multiple)
CORS_ORIGINS=https://your-domain.com

# IMPORTANT: replace with a long random string. e.g. `openssl rand -hex 32`
JWT_SECRET=replace-me-with-a-long-random-hex-string

# Internal hostnames — these match the docker-compose service names
DATABASE_URL=postgresql+asyncpg://recipyai:recipyai@postgres:5432/recipyai
REDIS_URL=redis://redis:6379/0

LLM_PROVIDER=anthropic        # or openai
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
OPENAI_API_KEY=sk-...         # also needed for Whisper fallback
OPENAI_MODEL=gpt-4o-mini

WHISPER_BACKEND=openai
```

> **Hardening note:** the default Postgres password (`recipyai/recipyai`) is fine because the DB only listens on the docker network — but if you map port 5432 to the host for any reason, change it.

### YouTube cookies file (required on data-center IPs)

YouTube blocks requests from data-center IPs (AWS / GCP / Hetzner / etc.) with "Sign in to confirm you're not a bot." To bypass, mount cookies from a logged-in browser session.

The repo ships a placeholder at `backend/youtube_cookies.txt.example`. The compose file mounts `backend/youtube_cookies.txt` (gitignored), so you need to put the real file in place before the first `docker compose up`.

**On your laptop**, install **"Get cookies.txt LOCALLY"** (Chrome / Firefox extension), open https://www.youtube.com while logged in (a throwaway Google account is safer), click the extension, and **Export** → it downloads `youtube.com_cookies.txt`.

**Upload to the server** (FileZilla, scp, or any SFTP client) into `/opt/recipyai/backend/youtube_cookies.txt`. Then on the server:

```bash
cd /opt/recipyai/backend
# If the upload landed as a different name, rename it:
# mv www.youtube.com_cookies.txt youtube_cookies.txt
chmod 600 youtube_cookies.txt
```

**If you skip this step**, the placeholder file is mounted instead — yt-dlp finds no useful cookies, and YouTube extraction will fail on a data-center IP with the bot-check error. (TikTok and Reels still work.)

The cookies expire when you log out / change password / etc. — if extraction starts failing again in a few weeks, re-export from your browser and replace the file.

## 4. Tighten `docker-compose.yml` for production

Open `backend/docker-compose.yml` and make three small changes:

1. **Drop `--reload` from the api command** — production uvicorn doesn't watch files.
2. **Bind the api port to localhost only** — nginx is the only thing that should reach it from outside Docker.
3. **Add `restart: unless-stopped`** to all four services.

The relevant sections should look like:

```yaml
services:
  postgres:
    # ... unchanged
    restart: unless-stopped

  redis:
    # ... unchanged
    restart: unless-stopped

  api:
    build: .
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "127.0.0.1:8000:8000"   # ← localhost only
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
    restart: unless-stopped
    # remove the volume mount during prod so the image is the source of truth
    # volumes:
    #   - ./:/app

  worker:
    build: .
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ["arq", "app.workers.tasks.WorkerSettings"]
    restart: unless-stopped
    # volumes:
    #   - ./:/app
```

Bring it up:

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

Verify:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","env":"production"}
```

## 5. Build the frontend

```bash
cd /opt/recipyai/recipieaii
cp .env.example .env
```

Edit `recipieaii/.env`:

```dotenv
# Same-origin: nginx will proxy /api → backend, no need for an absolute URL
VITE_API_BASE_URL=/api
```

Install + build:

```bash
npm install
npm run build
```

That produces `recipieaii/dist/` — the static SPA bundle nginx will serve.

## 6. nginx — TLS, SPA, reverse proxy

Create `/etc/nginx/sites-available/recipyai`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Certbot will replace this block with a 443 redirect after `--nginx`.

    # Frontend SPA
    root /opt/recipyai/recipieaii/dist;
    index index.html;

    # gzip text assets
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache hashed asset bundles aggressively (Vite hashes filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API reverse proxy — strip the leading /api so the FastAPI app
    # sees its own routes (it's not mounted under /api).
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;     # Whisper jobs can be slow
        proxy_connect_timeout 30s;
        client_max_body_size 25m;
    }

    # SPA fallback — every other route serves index.html so React Router can handle it
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable + reload:

```bash
sudo ln -sf /etc/nginx/sites-available/recipyai /etc/nginx/sites-enabled/recipyai
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Point your domain's A record at the server IP, wait for DNS to propagate, then provision TLS:

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot rewrites the server block to redirect 80→443 and installs the cert. Renewal is automatic via the systemd timer it sets up.

## 7. Verify

```bash
curl -I https://your-domain.com         # 200 OK, nginx
curl https://your-domain.com/api/health # {"status":"ok","env":"production"}
```

Open https://your-domain.com in a browser, register an account, paste a YouTube cooking URL.

## 8. Updating

When you push code:

```bash
cd /opt/recipyai
git pull

# Backend changes
cd backend
docker compose up -d --build
docker compose exec api alembic upgrade head

# Frontend changes
cd ../recipieaii
npm install            # only if package.json changed
npm run build
# nginx auto-serves the new dist/ — no reload needed
```

If you changed `backend/.env`, recreate (compose `restart` doesn't reload `env_file`):

```bash
docker compose up -d --force-recreate api worker
```

## 9. Backups (recommended)

Postgres data lives in the `pgdata` volume. A weekly dump uploaded to S3/B2/Backblaze is enough for a small app:

```bash
# /etc/cron.weekly/recipyai-backup
#!/bin/bash
set -e
ts=$(date -u +%Y%m%dT%H%M%SZ)
docker compose -f /opt/recipyai/backend/docker-compose.yml exec -T postgres \
  pg_dump -U recipyai recipyai | gzip > /var/backups/recipyai-$ts.sql.gz
# (then rclone / aws s3 cp the file off-server)
find /var/backups -name 'recipyai-*.sql.gz' -mtime +30 -delete
```

`chmod +x /etc/cron.weekly/recipyai-backup`.

## 10. Common issues

| Symptom | Likely cause |
|---------|--------------|
| `502 Bad Gateway` from nginx on `/api/*` | API container not running. `docker compose ps` and `logs api`. |
| `socket.gaierror: Name or service not known` from asyncpg | Postgres container isn't on the compose network. Run `docker compose down && docker compose up -d` to recreate it. |
| Login works but recipe creation hangs | Worker isn't running. `docker compose logs worker`. |
| CORS errors in browser console | `CORS_ORIGINS` in `backend/.env` doesn't include your real domain. Update + `docker compose up -d --force-recreate api`. |
| 404 on direct route loads (e.g. `/app/library`) | nginx `try_files` SPA fallback missing. Re-check the `location /` block. |

## 11. Sizing

A 2-vCPU / 4 GB / 40 GB SSD VPS (~$5–10/mo) is plenty for early users. The biggest spike is when Whisper transcription runs for a video — short, bursty CPU. Postgres + Redis are tiny at this scale.

## 12. Anti-checklist (don't do these)

- ❌ Don't expose Postgres / Redis to the public internet (keep `127.0.0.1:` bindings or no host port at all).
- ❌ Don't commit `.env` or your real `JWT_SECRET` / API keys.
- ❌ Don't run uvicorn with `--reload` in production (file-watcher overhead, restarts on disk I/O).
- ❌ Don't put your API keys in `recipieaii/.env` — they're for the **backend** only. The frontend never talks to LLM providers directly.
