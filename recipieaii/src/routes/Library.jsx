import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Card, Pill, Spinner } from '../components/ui'

export default function Library() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.get('/recipes/mine').then(setRows).catch((e) => setErr(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return null
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.cuisine?.toLowerCase().includes(q),
    )
  }, [rows, query])

  if (err) return <Alert>{err}</Alert>
  if (rows === null) return <Spinner label="Pulling the file…" />

  if (rows.length === 0) {
    return (
      <div className="space-y-10">
        <Header count={0} />
        <Card className="text-center py-16">
          <p className="font-display italic text-ink-muted text-xl">
            An empty archive.
          </p>
          <p className="text-ink-soft mt-3">
            Your library is waiting.{' '}
            <Link to="/app" className="link-grow text-terracotta">
              Add your first recipe
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <Header count={rows.length} />

      {/* Filter */}
      <div className="relative max-w-md">
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted">
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search the archive…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-rule pl-7 py-3 text-base font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="font-display italic text-ink-muted">
          Nothing matches “{query}”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <li key={r.id}>
              <Link
                to={`/app/recipes/${r.id}`}
                className="group h-full block bg-paper-soft border border-rule-soft rounded-2xl p-6 hover:border-ink/30 hover:shadow-[0_4px_28px_-12px_rgba(28,24,21,0.18)] transition-all"
              >
                <div className="flex items-baseline justify-between mb-4">
                  <span className="font-display italic text-ink-muted tnum text-sm">
                    №{String(i + 1).padStart(3, '0')}
                  </span>
                  {r.visibility === 'public' && <Pill tone="accent">public</Pill>}
                </div>
                <h3 className="font-display text-xl leading-snug line-clamp-2 group-hover:text-terracotta transition-colors">
                  {r.title}
                </h3>
                {r.summary && (
                  <p className="text-sm text-ink-soft mt-2 line-clamp-3">
                    {r.summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-5 text-xs text-ink-muted tnum">
                  {r.total_time_min && <span>⏱ {r.total_time_min} min</span>}
                  {r.cuisine && (
                    <span className="capitalize">· {r.cuisine}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Header({ count }) {
  return (
    <header>
      <div className="flex items-baseline gap-4 mb-4">
        <span className="font-display italic text-ink-muted tnum">01</span>
        <span className="eyebrow">The complete archive</span>
        <span className="flex-1 h-px bg-rule" />
        <span className="eyebrow tnum">{count} {count === 1 ? 'entry' : 'entries'}</span>
      </div>
      <h1 className="display-lg">
        Your{' '}
        <span className="italic" style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
          library
        </span>
      </h1>
    </header>
  )
}
