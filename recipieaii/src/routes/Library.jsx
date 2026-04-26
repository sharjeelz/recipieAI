import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Card, Pill, Spinner } from '../components/ui'
import { formatAbsolute, formatRelativeTime } from '../lib/relativeTime'

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'a-z', label: 'A → Z' },
  { id: 'time', label: 'Quickest' },
]

export default function Library() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState(null) // null = "all"
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    api.get('/recipes/mine').then(setRows).catch((e) => setErr(e.message))
  }, [])

  // Build the cuisine filter list from existing recipes — only show what exists
  const cuisines = useMemo(() => {
    if (!rows) return []
    const set = new Map()
    for (const r of rows) {
      if (!r.cuisine) continue
      const key = r.cuisine.toLowerCase()
      set.set(key, (set.get(key) || 0) + 1)
    }
    return [...set.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return null
    const q = query.trim().toLowerCase()
    let out = rows

    if (q) {
      out = out.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.summary?.toLowerCase().includes(q) ||
          r.cuisine?.toLowerCase().includes(q),
      )
    }
    if (cuisine) {
      out = out.filter((r) => r.cuisine?.toLowerCase() === cuisine)
    }
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'a-z':
          return (a.title || '').localeCompare(b.title || '')
        case 'time':
          return (a.total_time_min ?? 9e9) - (b.total_time_min ?? 9e9)
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })
    return out
  }, [rows, query, cuisine, sort])

  if (err) return <Alert>{err}</Alert>
  if (rows === null) return <Spinner label="Pulling the file…" />

  if (rows.length === 0) {
    return (
      <div className="space-y-10">
        <Header total={0} shown={0} />
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

  const hasFilters = !!query || !!cuisine
  const filteredCount = filtered?.length ?? 0

  return (
    <div className="space-y-8">
      <Header total={rows.length} shown={hasFilters ? filteredCount : null} />

      {/* Prominent search bar */}
      <div className="relative">
        <span
          className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted text-xl pointer-events-none"
          aria-hidden="true"
        >
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search by title, summary, or cuisine…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-paper-soft border border-rule rounded-2xl pl-14 pr-12 py-4 text-base font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors shadow-[0_1px_0_rgba(28,24,21,0.04),0_18px_40px_-30px_rgba(28,24,21,0.18)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-ink-muted hover:text-ink hover:bg-paper-deep transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        )}
      </div>

      {/* Cuisine filter chips */}
      {cuisines.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Cuisine</span>
          <CuisineChip
            active={cuisine === null}
            onClick={() => setCuisine(null)}
          >
            All
          </CuisineChip>
          {cuisines.map((c) => (
            <CuisineChip
              key={c.name}
              active={cuisine === c.name}
              onClick={() => setCuisine(c.name === cuisine ? null : c.name)}
            >
              <span className="capitalize">{c.name}</span>
              <span className="text-ink-muted ml-1.5 tnum text-[10px]">{c.count}</span>
            </CuisineChip>
          ))}
        </div>
      )}

      {/* Sort selector */}
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <span className="eyebrow">Sort by</span>
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={
                'px-3 py-1.5 rounded-full text-sm transition-colors ' +
                (sort === s.id
                  ? 'bg-ink text-paper'
                  : 'text-ink-muted hover:text-ink')
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="font-display italic text-ink-muted text-lg">
            No matches{query ? ` for “${query}”` : ''}
            {cuisine ? ` in ${cuisine}` : ''}.
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setQuery('')
                setCuisine(null)
              }}
              className="mt-3 link-grow text-sm text-terracotta tracking-wide"
            >
              Clear all filters
            </button>
          )}
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <li key={r.id}>
              <Link
                to={`/app/recipes/${r.id}`}
                className="group h-full flex flex-col bg-paper-soft border border-rule-soft rounded-2xl overflow-hidden hover:border-ink/30 hover:shadow-[0_4px_28px_-12px_rgba(28,24,21,0.18)] transition-all"
              >
                <CardImage
                  src={r.thumbnail_url}
                  fallback={r.title}
                  badge={
                    r.visibility === 'public'
                      ? <Pill tone="accent">public</Pill>
                      : null
                  }
                  index={i + 1}
                />
                <div className="flex flex-col flex-1 p-5">
                  <h3 className="font-display text-xl leading-snug line-clamp-2 group-hover:text-terracotta transition-colors">
                    {r.title}
                  </h3>
                  {r.summary && (
                    <p className="text-sm text-ink-soft mt-2 line-clamp-3">
                      {r.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-baseline gap-3 mt-auto pt-4 text-xs text-ink-muted">
                    {r.total_time_min && (
                      <span className="tnum">⏱ {r.total_time_min} min</span>
                    )}
                    {r.cuisine && (
                      <span className="capitalize">· {r.cuisine}</span>
                    )}
                    {r.created_at && (
                      <span
                        className="ml-auto italic"
                        title={formatAbsolute(r.created_at)}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {formatRelativeTime(r.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Header({ total, shown }) {
  const showingFiltered = shown !== null && shown !== total
  return (
    <header>
      <div className="flex items-baseline gap-4 mb-4">
        <span className="font-display italic text-ink-muted tnum">01</span>
        <span className="eyebrow">The complete archive</span>
        <span className="flex-1 h-px bg-rule" />
        <span className="eyebrow tnum">
          {showingFiltered
            ? `${shown} of ${total}`
            : `${total} ${total === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>
      <h1 className="display-lg">
        Your{' '}
        <span
          className="italic"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}
        >
          library
        </span>
      </h1>
    </header>
  )
}

/**
 * Thumbnail strip for a recipe card. Falls back to a stylized terracotta block
 * with the recipe's first letter when no image exists or the image fails to load.
 */
function CardImage({ src, fallback, badge, index }) {
  const [errored, setErrored] = useState(false)
  const showImage = !!src && !errored
  const initial = (fallback || '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #f2d8ce 0%, #ebe2d2 70%)',
          }}
        >
          <span
            className="font-display italic text-terracotta/70"
            style={{
              fontSize: '5rem',
              lineHeight: 1,
              fontVariationSettings: '"opsz" 144, "SOFT" 100',
            }}
          >
            {initial}
          </span>
        </div>
      )}
      <div className="absolute top-3 left-3">
        <span className="inline-flex items-center font-display italic text-paper-soft tnum text-xs px-2 py-1 rounded-full bg-ink/60 backdrop-blur-sm">
          №{String(index).padStart(3, '0')}
        </span>
      </div>
      {badge && <div className="absolute top-3 right-3">{badge}</div>}
    </div>
  )
}

function CuisineChip({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'inline-flex items-center px-3 py-1.5 rounded-full border text-sm transition-colors ' +
        (active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper-soft border-rule text-ink-soft hover:border-ink')
      }
    >
      {children}
    </button>
  )
}
