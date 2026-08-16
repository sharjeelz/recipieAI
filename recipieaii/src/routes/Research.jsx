import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, SectionLabel, Spinner } from '../components/ui'

const SUGGESTIONS = [
  'butter chicken',
  'sourdough focaccia',
  'one pot pasta',
  '15 minute breakfast',
  'biryani',
]

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

function formatViews(n) {
  if (typeof n !== 'number') return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`
  if (n >= 1_000) return `${Math.round(n / 1000)}K views`
  return `${n} views`
}

export default function Research() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  // Which result is currently being handed to the extraction pipeline
  const [scraping, setScraping] = useState(null)
  const [sort, setSort] = useState('views')

  // YouTube returns results in relevance order; sorting by views is a local
  // re-order of that same page (not a wider search).
  const sorted = useMemo(() => {
    if (!results) return results
    if (sort !== 'views') return results
    // Entries without a view count sink to the bottom rather than sorting as 0.
    return [...results].sort((a, b) => {
      const av = typeof a.view_count === 'number' ? a.view_count : -1
      const bv = typeof b.view_count === 'number' ? b.view_count : -1
      return bv - av
    })
  }, [results, sort])

  async function runSearch(term) {
    const query = term.trim()
    if (query.length < 2) return
    setErr(null)
    setLoading(true)
    setResults(null)
    setParams({ q: query }, { replace: true })
    try {
      const data = await api.get(`/research/search?q=${encodeURIComponent(query)}&limit=12`)
      setResults(data.results || [])
    } catch (e) {
      setErr(e.message || 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function scrape(result) {
    setErr(null)
    setScraping(result.video_id)
    try {
      const { job_id } = await api.post('/recipes', { url: result.url })
      navigate(`/app/jobs/${job_id}`)
    } catch (e) {
      setErr(e.message || 'Could not start extraction')
      setScraping(null)
    }
  }

  return (
    <div className="space-y-12">
      <section className="rise">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-display italic text-ink-muted tnum">01</span>
          <span className="eyebrow">Research</span>
          <span className="flex-1 h-px bg-rule" />
        </div>

        <h1 className="display-lg max-w-3xl">
          Search YouTube.{' '}
          <span className="italic" style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
            Scrape what you like.
          </span>
        </h1>
        <p className="mt-5 text-ink-soft text-lg max-w-2xl leading-relaxed">
          Find a cooking video without leaving the archive — then send it straight
          into the extractor.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            runSearch(q)
          }}
          className="mt-8 space-y-4 max-w-3xl"
        >
          {err && <Alert>{err}</Alert>}

          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 font-display italic text-ink-muted text-lg pointer-events-none">
              ⌕
            </span>
            <input
              type="search"
              required
              minLength={2}
              placeholder="karahi gosht, no-knead bread, weeknight ramen…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
              className="w-full bg-transparent border-0 border-b-2 border-rule pl-7 pr-2 py-4 text-lg sm:text-xl font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQ(s)
                    runSearch(s)
                  }}
                  className="text-xs tracking-wide text-ink-muted hover:text-terracotta border border-rule rounded-full px-3 py-1 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <Button type="submit" variant="accent" size="lg" disabled={loading} className="shrink-0">
              {loading ? 'Searching…' : 'Search →'}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <SectionLabel number="02">Results</SectionLabel>

        {results !== null && results.length > 0 && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <span className="text-xs text-ink-muted tracking-widest uppercase">Sort</span>
            {[
              { key: 'views', label: 'Most viewed' },
              { key: 'relevance', label: 'Relevance' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSort(opt.key)}
                aria-pressed={sort === opt.key}
                className={
                  'text-xs tracking-wide border rounded-full px-3 py-1 transition-colors ' +
                  (sort === opt.key
                    ? 'border-terracotta text-terracotta'
                    : 'border-rule text-ink-muted hover:text-ink')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <Spinner label="Combing the shelves…" />
          ) : results === null ? (
            <p className="text-ink-muted text-sm">
              Type a dish, a technique, or a chef's name to begin.
            </p>
          ) : results.length === 0 ? (
            <p className="text-ink-muted text-sm">
              Nothing came back. Try different wording, or paste the link directly on Home.
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {sorted.map((r) => (
                <ResultCard
                  key={r.video_id}
                  result={r}
                  busy={scraping === r.video_id}
                  disabled={scraping !== null}
                  onScrape={() => scrape(r)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function ResultCard({ result, busy, disabled, onScrape }) {
  const duration = formatDuration(result.duration_seconds)
  const views = formatViews(result.view_count)

  return (
    <li className="group border border-rule rounded-lg overflow-hidden flex flex-col bg-paper">
      <a
        href={result.url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-video bg-rule/30"
        title="Open on YouTube"
      >
        {result.thumbnail_url ? (
          <img
            src={result.thumbnail_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-ink-muted text-sm">
            no preview
          </span>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 text-[11px] tnum bg-black/75 text-white px-1.5 py-0.5 rounded">
            {duration}
          </span>
        )}
      </a>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-display text-lg leading-snug line-clamp-2">{result.title || 'Untitled'}</h3>
        <p className="text-xs text-ink-muted">
          {[result.channel, views].filter(Boolean).join(' · ')}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ink-muted hover:text-ink tracking-wide"
          >
            Watch ↗
          </a>
          <Button
            type="button"
            variant="accent"
            onClick={onScrape}
            disabled={disabled}
            className="shrink-0"
          >
            {busy ? 'Starting…' : 'Scrape →'}
          </Button>
        </div>
      </div>
    </li>
  )
}
