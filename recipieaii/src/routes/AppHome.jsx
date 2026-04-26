import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Pill, SectionLabel, Spinner } from '../components/ui'
import { formatAbsolute, formatRelativeTime } from '../lib/relativeTime'

export default function AppHome() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [recent, setRecent] = useState(null)

  useEffect(() => {
    api
      .get('/recipes/mine')
      .then((rows) => setRecent(rows.slice(0, 5)))
      .catch(() => setRecent([]))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { job_id } = await api.post('/recipes', { url })
      navigate(`/app/jobs/${job_id}`)
    } catch (e) {
      setErr(e.message || 'Could not start job')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-16">
      {/* === Compose === */}
      <section className="rise">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-display italic text-ink-muted tnum">01</span>
          <span className="eyebrow">Today's entry</span>
          <span className="flex-1 h-px bg-rule" />
        </div>

        <h1 className="display-lg max-w-3xl">
          Paste a link.{' '}
          <span className="italic" style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
            Cook the rest.
          </span>
        </h1>
        <p className="mt-5 text-ink-soft text-lg max-w-2xl leading-relaxed">
          YouTube, TikTok, or Instagram Reels — we'll listen, read, and structure it
          into a recipe filed under your name.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 max-w-3xl">
          {err && <Alert>{err}</Alert>}

          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 font-display italic text-ink-muted text-lg pointer-events-none">
              ↳
            </span>
            <input
              type="url"
              required
              placeholder="https://youtube.com/watch?v=…   tiktok.com/@chef/video/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              className="w-full bg-transparent border-0 border-b-2 border-rule pl-7 pr-2 py-4 text-lg sm:text-xl font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-ink-muted leading-relaxed max-w-md">
              We try captions first, then the description, audio only if needed.
              A small classifier keeps non-recipe videos out of your archive.
            </p>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={busy}
              className="shrink-0"
            >
              {busy ? 'Starting…' : 'Extract recipe →'}
            </Button>
          </div>
        </form>
      </section>

      {/* === Recent === */}
      <section>
        <SectionLabel number="02">Lately in your archive</SectionLabel>

        <div className="mt-8">
          {recent === null ? (
            <Spinner label="Pulling the file…" />
          ) : recent.length === 0 ? (
            <EmptyArchive />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recent.map((r, i) => (
                <RecipeCard key={r.id} recipe={r} index={i} />
              ))}
            </ul>
          )}

          {recent && recent.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Link
                to="/app/library"
                className="link-grow text-sm text-terracotta tracking-wide"
              >
                View the full archive →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyArchive() {
  return (
    <Card className="text-center py-12">
      <p className="font-display italic text-ink-muted text-lg">
        An empty page.
      </p>
      <p className="text-ink-soft mt-2">
        Paste your first link above to begin.
      </p>
    </Card>
  )
}

function RecipeCard({ recipe, index }) {
  return (
    <li>
      <Link
        to={`/app/recipes/${recipe.id}`}
        className="group block bg-paper-soft border border-rule-soft rounded-2xl p-6 hover:border-ink/30 hover:shadow-[0_4px_28px_-12px_rgba(28,24,21,0.18)] transition-all"
      >
        <div className="flex items-baseline justify-between mb-4">
          <span className="font-display italic text-ink-muted tnum text-sm">
            {String(index + 1).padStart(2, '0')}
          </span>
          {recipe.visibility === 'public' && (
            <Pill tone="accent">public</Pill>
          )}
        </div>
        <h3 className="font-display text-xl leading-snug line-clamp-2 group-hover:text-terracotta transition-colors">
          {recipe.title}
        </h3>
        {recipe.summary && (
          <p className="text-sm text-ink-soft mt-2 line-clamp-2">
            {recipe.summary}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-5 text-xs text-ink-muted tnum">
          {recipe.total_time_min && <span>⏱ {recipe.total_time_min} min</span>}
          {recipe.cuisine && <span className="capitalize">· {recipe.cuisine}</span>}
          {recipe.created_at && (
            <span
              className="ml-auto italic"
              title={formatAbsolute(recipe.created_at)}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              added {formatRelativeTime(recipe.created_at)}
            </span>
          )}
        </div>
      </Link>
    </li>
  )
}
