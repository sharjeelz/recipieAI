# Running RecipyAI at home (Windows + Tailscale)

A guide for personal use — two people, your home PC as the server, accessible from any phone or laptop you own.

## Why this beats AWS for personal use

- **Free** — no monthly bills.
- **Residential IP** — YouTube doesn't flag you as a bot. No cookies file, no proxy, no rotation hell.
- **Simple** — your existing `docker compose up` setup is the whole stack.
- **Tradeoff** — only available when the PC is on. (For "I'm cooking, give me the recipe" that's fine. For supermarket-on-phone-while-shopping, leave the PC awake.)

## What we're building

```
[Wife's iPhone]    [Your laptop]    [Your PC running it all]
       │                 │                       │
       └─── Tailscale (private encrypted network) ──┘

http://100.x.y.z:5173 → Vite (frontend) → /api proxy → localhost:8000 (backend container)
```

Tailscale gives every device a stable, private IP that works from anywhere — at home, on cellular, on coffee-shop wifi. No port forwarding, no firewall opening, no domain.

---

## 1. Backend — already done

You already have this running:

```powershell
cd C:\Dawul\RecipyAi-web\backend
docker compose up -d
```

Verify it's up:

```powershell
docker compose ps
curl http://localhost:8000/health
```

If you've never run migrations on this Postgres volume:

```powershell
docker compose exec api alembic upgrade head
```

## 2. Frontend — bind to all interfaces

By default, `npm run dev` only listens on `localhost`, so other devices on Tailscale can't reach it. Two options:

### Option A — dev mode with `--host` (HMR + great for iterating)

```powershell
cd C:\Dawul\RecipyAi-web\recipieaii
npm install
npm run dev -- --host 0.0.0.0
```

Vite will print **two** URLs:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Both work. Tailscale will add a third URL once it's installed.

### Option B — production build + preview (lighter, no HMR)

```powershell
cd C:\Dawul\RecipyAi-web\recipieaii
npm install
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

Either works. Use A while you're tinkering, B once you're settled.

## 3. Install Tailscale on the PC

1. Download from **https://tailscale.com/download/windows** and install.
2. Sign in (Google / Microsoft / GitHub account — uses your existing identity, no Tailscale account password).
3. Tailscale runs in the system tray.

Find your PC's Tailscale IP — open PowerShell:

```powershell
tailscale ip -4
```

You'll get something like `100.64.12.34`. **Write this down.**

Test from the same PC:

```powershell
curl http://100.64.12.34:5173
```

Should return the index.html.

## 4. Install Tailscale on your wife's iPhone

1. App Store → search "Tailscale" → install.
2. Open it → "Sign in" → use the **same identity** you used on the PC (Google / Microsoft / etc).
3. Toggle the VPN on.

That's it. Both devices are now on your private Tailnet.

To verify on the iPhone, open Safari and visit:

```
http://100.64.12.34:5173
```

(Replace `100.64.12.34` with your actual Tailscale IP from step 3.)

You should see the RecipyAI landing page. Register an account, paste a YouTube URL, and it Just Works™ — residential IP means no YouTube anti-bot.

## 5. (Recommended) Use MagicDNS for nicer URLs

Memorizing `100.64.12.34` is annoying. Tailscale's MagicDNS gives the PC a real name like `recipyai-pc.tail-xxxx.ts.net`.

1. Open https://login.tailscale.com/admin/dns
2. Toggle **MagicDNS: ON** (it's on by default for new tailnets).
3. Note the device's "MagicDNS name" — usually `<your-pc-hostname>.tail-xxxx.ts.net`.

Now everyone on your Tailnet (you, your wife, the iPhone) can use:

```
http://recipyai-pc.tail-xxxx.ts.net:5173
```

Bookmark it on your wife's iPhone home screen — Safari → share button → "Add to Home Screen". It looks like a native app.

## 6. (Optional) Auto-start on PC boot

So you don't have to open PowerShell after every reboot:

### 6a. Backend (Docker)

In `backend/docker-compose.yml`, the services already have `depends_on` and `healthcheck` — they're idempotent. Make Docker Desktop auto-start on login:

- **Docker Desktop** → ⚙ Settings → General → ☑ "Start Docker Desktop when you sign in"
- Compose stack persists; once Docker is up, your containers come back automatically (because they have implicit restart policy from the previous fixes — or add `restart: unless-stopped` to each service).

### 6b. Frontend

Easiest — make a `.bat` file:

```powershell
# Save as C:\Dawul\RecipyAi-web\start-frontend.bat
cd /d C:\Dawul\RecipyAi-web\recipieaii
npm run dev -- --host 0.0.0.0
```

Then put a shortcut to it in:
```
C:\Users\<you>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

It'll run on every login. (Press `Win+R`, type `shell:startup`, hit Enter — that opens the folder.)

## 7. (Future) Public access via Tailscale Funnel

If you ever want to share a recipe page with a friend who isn't on your Tailnet:

```powershell
tailscale funnel 5173
```

That gives you a public HTTPS URL (`https://recipyai-pc.tail-xxxx.ts.net`) that anyone can visit, served through Tailscale's edge with TLS. Free for personal use, no domain needed. Turn off when done with `tailscale funnel reset`.

> ⚠ Funnel exposes your app to the public internet. The auth/login still protects it, but use a strong `JWT_SECRET` in `backend/.env` if you turn it on.

---

## Decommissioning AWS

Once Tailscale is working from your wife's phone, you can shut down the EC2 box:

1. AWS Console → EC2 → select instance → Actions → Stop or Terminate.
2. Cancel any reserved instances or auto-renewing services.
3. (Optional) Keep the domain — you can repoint it at Tailscale Funnel later.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Wife's iPhone can't reach the URL | Make sure Tailscale is **toggled on** on her phone (it's a regular VPN toggle in iOS settings). |
| Site loads but API calls 500 / network error | Backend container isn't running. `docker compose ps` on the PC. |
| `npm run dev` works on PC but iPhone hangs | You forgot `--host 0.0.0.0`; Vite is only on localhost. |
| Vite says `EADDRINUSE :5173` | Another instance is already running. `taskkill /IM node.exe /F` (kills all Node) or use a different port: `--port 5174`. |
| Login works on PC but errors on iPhone | The browser's clock is way off OR cookies aren't getting set on `100.x.y.z`. Try MagicDNS hostname instead — Safari is friendlier with named hosts than raw IPs. |
| Recipe extraction still says "Sign in to confirm you're not a bot" | You're hitting YouTube from a non-residential IP. Tailscale tunnels back to your PC, so the request leaves from your home ISP — confirm by running `curl ifconfig.me` from the PC and verifying the IP is your home IP. If it's your AWS IP, the PC is somehow still routing through there. |

---

## Day-2 ops

- **Updating the app** — `git pull` in the project, then `cd backend && docker compose up -d --build api worker` and `cd recipieaii && npm install && npm run build` (if using preview mode).
- **Postgres data** — lives in the `pgdata` Docker volume on your PC. Survives restarts. If you want a backup: `docker compose exec postgres pg_dump -U recipyai recipyai > backup.sql`.
- **Cookies file** — you don't need it on residential IP. The placeholder in `backend/youtube_cookies.txt` is fine.
