import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Spinner } from '../components/ui'
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
          ? 'All ingredients already on your list.'
          : `Added ${r.added} item${r.added === 1 ? '' : 's'}` +
            (r.skipped ? ` · ${r.skipped} already on list` : '')
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
  if (!recipe) return <Spinner label="Loading recipe…" />

  const active = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]
  const displayed = lang === 'en' ? recipe : { ...recipe, ...translations[lang] }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/cook/${recipeId}`)} disabled={busy}>
          👩‍🍳 Start cooking
        </Button>
        <Button variant="secondary" onClick={onAddToShoppingList} disabled={busy}>
          🛒 Add to shopping list
        </Button>
        <Button variant="secondary" onClick={onShare} disabled={busy}>
          🔗 Share
        </Button>
        <Button variant="secondary" onClick={onToggleVisibility} disabled={busy}>
          {recipe.visibility === 'public' ? 'Make private' : 'Make public'}
        </Button>
        <Button variant="danger" onClick={onDelete} disabled={busy} className="ml-auto">
          Delete
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Language:</span>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onChangeLanguage(l.code)}
            disabled={translating}
            className={
              'px-3 py-1.5 rounded-full border transition ' +
              (lang === l.code
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400')
            }
          >
            {l.label}
          </button>
        ))}
        {translating && <Spinner label="Translating…" />}
      </div>

      {shopStatus && (
        <Card className="bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-900">{shopStatus}</p>
        </Card>
      )}

      {shareUrl && (
        <Card className="bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-900 mb-1">Share link:</p>
          <code className="text-xs break-all text-emerald-800">{shareUrl}</code>
        </Card>
      )}

      <div dir={active.dir}>
        <RecipeBody recipe={displayed} />
      </div>
    </div>
  )
}
