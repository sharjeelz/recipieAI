import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Spinner } from '../components/ui'
import RecipeBody from '../components/RecipeBody'
import { formatRelativeTime } from '../lib/relativeTime'

const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
]

export default function RecipeView() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [err, setErr] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)
  const [busy, setBusy] = useState(false)

  const [lang, setLang] = useState('en')
  const [translations, setTranslations] = useState({})
  const [translating, setTranslating] = useState(false)
  const [shopStatus, setShopStatus] = useState(null)

  useEffect(() => {
    api.get(`/recipes/${recipeId}`).then(setRecipe).catch((e) => setErr(e.message))
  }, [recipeId])

  async function onDelete() {
    if (!confirm('Delete this recipe? This can\'t be undone.')) return
    setBusy(true)
    try {
      await api.del(`/recipes/${recipeId}`)
      navigate('/app/library', { replace: true })
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  async function onShare() {
    setBusy(true)
    try {
      const { token } = await api.post(`/recipes/${recipeId}/share`)
      const full = `${window.location.origin}/s/${token}`
      setShareUrl(full)
      if (navigator.share) {
        try {
          await navigator.share({ title: recipe.title, url: full })
        } catch {
          // user cancelled — leave the URL visible
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(full)
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onToggleVisibility() {
    setBusy(true)
    try {
      const next = recipe.visibility === 'public' ? 'private' : 'public'
      const updated = await api.patch(`/recipes/${recipeId}`, { visibility: next })
      setRecipe(updated)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onAddToShoppingList() {
    setBusy(true)
    setShopStatus(null)
    try {
      const r = await api.post(`/shopping-list/from-recipe/${recipeId}`)
      const msg =
        r.added === 0
          ? 'All items already on your list.'
          : `Added ${r.added} item${r.added === 1 ? '' : 's'}` +
            (r.skipped ? ` · ${r.skipped} already there` : '')
      setShopStatus(msg)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onChangeLanguage(code) {
    if (code === lang) return
    if (code === 'en' || translations[code]) {
      setLang(code)
      return
    }
    setTranslating(true)
    setErr(null)
    try {
      const t = await api.post(`/recipes/${recipeId}/translate`, { language: code })
      setTranslations((prev) => ({ ...prev, [code]: t }))
      setLang(code)
    } catch (e) {
      setErr(e.message)
    } finally {
      setTranslating(false)
    }
  }

  if (err) return <Alert>{err}</Alert>
  if (!recipe) return <Spinner label="Pulling the file…" />

  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]
  const displayed = lang === 'en' ? recipe : { ...recipe, ...translations[lang] }

  return (
    <div className="space-y-10">
      {/* Print-only masthead — appears at the top of the printed page */}
      <div className="print-only" style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid #1c1815',
            paddingBottom: '0.5rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          <span style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
            From the kitchen of RecipyAI
          </span>
          <span style={{ fontSize: '0.8rem', color: '#877e72' }}>
            Printed {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Floating action bar — hidden on print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rise">
        <button
          onClick={() => navigate(-1)}
          className="link-grow text-sm text-ink-muted tracking-wide"
        >
          ← Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              const q = lang && lang !== 'en' ? `?lang=${lang}` : ''
              navigate(`/cook/${recipeId}${q}`)
            }}
            disabled={busy}
            variant="accent"
          >
            <span className="mr-2">⌬</span>
            Start cooking{lang !== 'en' ? ` · ${active.label}` : ''}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onAddToShoppingList}
            disabled={busy}
          >
            + Market list
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.print()}
          >
            🖨 Print
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onShare}
            disabled={busy}
          >
            Share
          </Button>
          <VisibilityToggle
            visibility={recipe.visibility}
            onToggle={onToggleVisibility}
            disabled={busy}
          />
          <Button
            variant="ghost"
            size="md"
            onClick={onDelete}
            disabled={busy}
            className="text-tomato hover:text-tomato"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Inline status banners */}
      {shopStatus && (
        <div className="no-print rounded-2xl bg-sage-soft border border-sage/20 px-5 py-3 text-sm text-[#3a4a2c] flex items-center gap-3">
          <span className="font-display italic">✓</span>
          {shopStatus}
        </div>
      )}

      {shareUrl && (
        <div className="no-print rounded-2xl bg-saffron-soft border border-saffron/30 px-5 py-4">
          <p className="eyebrow mb-1 text-[#7a5612]">Share link</p>
          <code className="text-xs sm:text-sm break-all text-ink-soft tracking-tight">
            {shareUrl}
          </code>
        </div>
      )}

      {/* Language switcher — magazine style */}
      <div className="no-print flex flex-wrap items-center gap-4 border-t border-b border-rule py-3">
        <span className="eyebrow">Language</span>
        <div className="flex items-center gap-1">
          {LANGUAGES.map((l) => {
            const active = lang === l.code
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => onChangeLanguage(l.code)}
                disabled={translating}
                className={
                  'px-3 py-1.5 rounded-full text-sm transition-colors ' +
                  (active
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:text-ink')
                }
              >
                {l.label}
              </button>
            )
          })}
        </div>
        {translating && <Spinner label="Translating…" />}
      </div>

      {/* The page itself */}
      <div dir={active.dir} lang={active.code} className="rise delay-2">
        <RecipeBody recipe={displayed} />
      </div>

      {/* Your verdict — was it any good, and did you actually make it */}
      <Verdict
        recipeId={recipeId}
        rating={recipe.my_rating ?? null}
        cookedCount={recipe.my_cooked_count ?? 0}
        lastCookedAt={recipe.my_last_cooked_at ?? null}
      />

      {/* Personal notes — your tweaks, observations, what went wrong */}
      <PersonalNotes recipeId={recipeId} initial={recipe.my_note ?? ''} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Verdict — the feedback loop the archive was missing. Without it you
   accumulate recipes with no way to tell the keepers from the duds.
   ────────────────────────────────────────────────────────────────── */

function Verdict({ recipeId, rating, cookedCount, lastCookedAt }) {
  const [stars, setStars] = useState(rating)
  const [hover, setHover] = useState(null)
  const [count, setCount] = useState(cookedCount)
  const [last, setLast] = useState(lastCookedAt)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function rate(value) {
    // Clicking the current rating clears it — no separate "unrate" control.
    const next = value === stars ? null : value
    const prev = stars
    setStars(next)
    setErr(null)
    try {
      await api.put(`/recipes/${recipeId}/rating`, { rating: next })
    } catch (e) {
      setStars(prev)
      setErr(e.message || 'Could not save rating')
    }
  }

  async function logCooked() {
    setBusy(true)
    setErr(null)
    try {
      const res = await api.post(`/recipes/${recipeId}/cooked`)
      setCount(res.cooked_count)
      setLast(res.last_cooked_at)
    } catch (e) {
      setErr(e.message || 'Could not log that')
    } finally {
      setBusy(false)
    }
  }

  const shown = hover ?? stars

  return (
    <section className="no-print border-t border-rule pt-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="eyebrow block mb-2">Your verdict</span>
          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHover(null)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={stars === n}
                className={
                  'text-2xl leading-none transition-colors ' +
                  (shown != null && n <= shown
                    ? 'text-saffron'
                    : 'text-rule hover:text-ink-muted')
                }
              >
                ★
              </button>
            ))}
            <span className="ml-3 text-xs text-ink-muted">
              {stars ? `${stars}/5 — tap again to clear` : 'Not rated yet'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <Button variant="ghost" size="md" onClick={logCooked} disabled={busy}>
            {busy ? 'Noting…' : '🍳 I cooked this'}
          </Button>
          <p className="text-xs text-ink-muted mt-2">
            {count > 0
              ? `Cooked ${count} ${count === 1 ? 'time' : 'times'}${
                  last ? ` · last ${formatRelativeTime(last)}` : ''
                }`
              : 'Never cooked'}
          </p>
        </div>
      </div>

      {err && (
        <p className="mt-3 text-xs text-terracotta">{err}</p>
      )}
    </section>
  )
}

function PersonalNotes({ recipeId, initial }) {
  const [text, setText] = useState(initial)
  const [savedText, setSavedText] = useState(initial)
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const debounceRef = useRef(null)
  const controllerRef = useRef(null)
  const errorRef = useRef(null)

  // Save with debounce — fires 800ms after the user stops typing
  useEffect(() => {
    if (text === savedText) return
    setStatus('saving')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      controllerRef.current?.abort?.()
      try {
        await api.put(`/recipes/${recipeId}/note`, { note: text })
        setSavedText(text)
        setStatus('saved')
        errorRef.current = null
      } catch (e) {
        errorRef.current = e.message
        setStatus('error')
      }
    }, 800)
    return () => clearTimeout(debounceRef.current)
  }, [text, savedText, recipeId])

  // Fade "saved" indicator back to idle after 1.5s
  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 1500)
    return () => clearTimeout(t)
  }, [status])

  return (
    <section className="border-t border-rule pt-10">
      <div className="flex items-baseline gap-4 mb-5">
        <span className="font-display italic text-ink-muted tnum">aside</span>
        <span className="eyebrow">Your notes</span>
        <span className="flex-1 h-px bg-rule" />
        <NotesStatus status={status} message={errorRef.current} />
      </div>

      <div className="bg-paper-soft border border-rule-soft rounded-2xl px-5 py-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Doubled the garlic. Used coconut milk instead of cream. Needed 5 more minutes in the oven…"
          rows={4}
          className="w-full bg-transparent border-0 resize-y font-display text-[17px] leading-relaxed text-ink placeholder:text-ink-muted/55 placeholder:italic focus:outline-none"
          maxLength={8000}
          spellCheck={true}
        />
      </div>

      <p className="text-xs text-ink-muted mt-3 leading-relaxed">
        Only you can see these. They stay attached even if the recipe is shared
        publicly.
      </p>
    </section>
  )
}

function NotesStatus({ status, message }) {
  if (status === 'saving') {
    return <span className="eyebrow text-ink-muted">saving…</span>
  }
  if (status === 'saved') {
    return <span className="eyebrow text-sage">✓ saved</span>
  }
  if (status === 'error') {
    return (
      <span className="eyebrow text-tomato" title={message}>
        ! couldn't save
      </span>
    )
  }
  return null
}

/**
 * Visibility toggle — a stateful pill, not just an action label.
 * Public:  filled sage dot + "Public"   (clearly the on state)
 * Private: hollow circle + "Private"    (clearly the off state)
 * Click flips the state. Title attribute spells out the consequence.
 */
function VisibilityToggle({ visibility, onToggle, disabled }) {
  const isPublic = visibility === 'public'
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isPublic}
      title={
        isPublic
          ? 'Public — anyone with the link can view. Click to make private.'
          : 'Private — only you can see this. Click to make public.'
      }
      className={
        'inline-flex items-center gap-2.5 px-4 py-3 min-h-[44px] rounded-full border text-sm font-medium tracking-wide transition-all ' +
        'disabled:opacity-50 disabled:cursor-not-allowed ' +
        (isPublic
          ? 'bg-sage-soft border-sage/40 text-[#3a4a2c] hover:border-sage'
          : 'bg-paper-soft border-rule text-ink-soft hover:border-ink')
      }
    >
      <span
        aria-hidden="true"
        className={
          'inline-flex h-3 w-3 rounded-full transition-colors ' +
          (isPublic
            ? 'bg-sage shadow-[0_0_0_3px_rgba(93,111,77,0.18)]'
            : 'border border-ink-muted bg-transparent')
        }
      />
      <span>{isPublic ? 'Public' : 'Private'}</span>
      <span className="text-ink-muted/70 text-xs hidden sm:inline">
        · tap to {isPublic ? 'make private' : 'make public'}
      </span>
    </button>
  )
}
