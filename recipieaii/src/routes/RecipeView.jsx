import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Spinner } from '../components/ui'
import RecipeBody from '../components/RecipeBody'

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
      {/* Floating action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rise">
        <button
          onClick={() => navigate(-1)}
          className="link-grow text-sm text-ink-muted tracking-wide"
        >
          ← Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate(`/cook/${recipeId}`)}
            disabled={busy}
            variant="accent"
          >
            <span className="mr-2">⌬</span> Start cooking
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
        <div className="rounded-2xl bg-sage-soft border border-sage/20 px-5 py-3 text-sm text-[#3a4a2c] flex items-center gap-3">
          <span className="font-display italic">✓</span>
          {shopStatus}
        </div>
      )}

      {shareUrl && (
        <div className="rounded-2xl bg-saffron-soft border border-saffron/30 px-5 py-4">
          <p className="eyebrow mb-1 text-[#7a5612]">Share link</p>
          <code className="text-xs sm:text-sm break-all text-ink-soft tracking-tight">
            {shareUrl}
          </code>
        </div>
      )}

      {/* Language switcher — magazine style */}
      <div className="flex flex-wrap items-center gap-4 border-t border-b border-rule py-3">
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
      <div dir={active.dir} className="rise delay-2">
        <RecipeBody recipe={displayed} />
      </div>
    </div>
  )
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
