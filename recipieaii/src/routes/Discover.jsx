import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Pill, SectionLabel, Spinner } from '../components/ui'

const TABS = [
  { key: 'public', label: 'Everyone' },
  { key: 'saved', label: 'Saved by you' },
]

export default function Discover() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') === 'saved' ? 'saved' : 'public')
  const [query, setQuery] = useState(params.get('q') || '')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  // Recipe ids with a save/unsave request in flight.
  const [pending, setPending] = useState([])

  const load = useCallback(async (nextTab, nextQuery) => {
    setErr(null)
    setRows(null)
    try {
      const path =
        nextTab === 'saved'
          ? '/recipes/saved'
          : `/recipes/public${
              nextQuery ? `?q=${encodeURIComponent(nextQuery)}` : ''
            }`
      setRows(await api.get(path))
    } catch (e) {
      setErr(e.message || 'Could not load recipes')
      setRows([])
    }
  }, [])

  useEffect(() => {
    load(tab, query)
    // Intentionally not re-running on `query` — search is submit-driven, so
    // typing shouldn't fire a request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, load])

  function selectTab(next) {
    setTab(next)
    setParams(next === 'saved' ? { tab: 'saved' } : {}, { replace: true })
  }

  function onSearch(e) {
    e.preventDefault()
    setParams(query ? { q: query } : {}, { replace: true })
    load(tab, query)
  }

  async function toggleSave(recipe) {
    const id = recipe.id
    setPending((p) => [...p, id])
    // Optimistic — the button should respond immediately, and a failure
    // just puts it back.
    const wasSaved = recipe.saved
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, saved: !wasSaved } : r)))
    try {
      if (wasSaved) await api.del(`/recipes/${id}/save`)
      else await api.post(`/recipes/${id}/save`)
      // On the saved tab, un-saving should remove the card outright.
      if (wasSaved && tab === 'saved') {
        setRows((rs) => rs.filter((r) => r.id !== id))
      }
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, saved: wasSaved } : r)))
      setErr(e.message || 'Could not update saved recipes')
    } finally {
      setPending((p) => p.filter((x) => x !== id))
    }
  }

  return (
    <div className="space-y-12">
      <section className="rise">
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-display italic text-ink-muted tnum">01</span>
          <span className="eyebrow">Discover</span>
          <span className="flex-1 h-px bg-rule" />
        </div>

        <h1 className="display-lg max-w-3xl">
          Recipes made public.{' '}
          <span
            className="italic"
            style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}
          >
            Borrow freely.
          </span>
        </h1>
        <p className="mt-5 text-ink-soft text-lg max-w-2xl leading-relaxed">
          What other cooks have chosen to share. Save one and it's yours to
          open any time — the original stays with its author.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key)}
              aria-pressed={tab === t.key}
              className={
                'text-sm tracking-wide border rounded-full px-4 py-1.5 transition-colors ' +
                (tab === t.key
                  ? 'border-terracotta text-terracotta'
                  : 'border-rule text-ink-muted hover:text-ink')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'public' && (
          <form onSubmit={onSearch} className="mt-6 max-w-2xl">
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 font-display italic text-ink-muted text-lg pointer-events-none">
                ⌕
              </span>
              <input
                type="search"
                placeholder="Search shared recipes by name or cuisine…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-rule pl-7 pr-2 py-3 text-lg font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors"
              />
            </div>
          </form>
        )}
      </section>

      <section>
        <SectionLabel number="02">
          {tab === 'saved' ? 'Your saved recipes' : 'Shared by the community'}
        </SectionLabel>

        <div className="mt-8 space-y-4">
          {err && <Alert>{err}</Alert>}

          {rows === null ? (
            <Spinner label="Looking around…" />
          ) : rows.length === 0 ? (
            <EmptyState tab={tab} searching={!!query} />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rows.map((r) => (
                <DiscoverCard
                  key={r.id}
                  recipe={r}
                  busy={pending.includes(r.id)}
                  onToggleSave={() => toggleSave(r)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function EmptyState({ tab, searching }) {
  if (tab === 'saved') {
    return (
      <p className="text-ink-muted text-sm">
        Nothing saved yet. Anything you save from{' '}
        <span className="text-ink-soft">Everyone</span> shows up here.
      </p>
    )
  }
  return (
    <p className="text-ink-muted text-sm">
      {searching
        ? 'No shared recipes match that. Try a different word.'
        : "Nobody's shared a recipe yet. Make one of yours public from its page and it'll appear here."}
    </p>
  )
}

function DiscoverCard({ recipe, busy, onToggleSave }) {
  return (
    <li className="group border border-rule rounded-lg overflow-hidden flex flex-col bg-paper">
      <Link to={`/app/recipes/${recipe.id}`} className="block">
        {recipe.thumbnail_url && (
          <div className="aspect-video bg-rule/30 overflow-hidden">
            <img
              src={recipe.thumbnail_url}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/app/recipes/${recipe.id}`}
            className="font-display text-lg leading-snug line-clamp-2 hover:text-terracotta transition-colors"
          >
            {recipe.title}
          </Link>
          {recipe.is_mine && <Pill>yours</Pill>}
        </div>

        <p className="text-xs text-ink-muted">
          {[
            recipe.author ? `by ${recipe.author}` : null,
            recipe.cuisine,
            recipe.total_time_min ? `${recipe.total_time_min} min` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {recipe.summary && (
          <p className="text-sm text-ink-soft leading-snug line-clamp-2">
            {recipe.summary}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <Link
            to={`/app/recipes/${recipe.id}`}
            className="text-xs text-ink-muted hover:text-ink tracking-wide"
          >
            Open →
          </Link>
          {/* Saving your own recipe is meaningless — it's already in Library. */}
          {!recipe.is_mine && (
            <button
              type="button"
              onClick={onToggleSave}
              disabled={busy}
              className={
                'text-xs tracking-widest uppercase transition-colors disabled:opacity-50 ' +
                (recipe.saved
                  ? 'text-sage hover:text-ink-muted'
                  : 'text-terracotta hover:text-terracotta-deep')
              }
            >
              {recipe.saved ? '✓ Saved' : '+ Save'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
