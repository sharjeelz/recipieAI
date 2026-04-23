import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Spinner } from '../components/ui'
import RecipeBody from '../components/RecipeBody'

export default function RecipeView() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [err, setErr] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)
  const [busy, setBusy] = useState(false)

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

  if (err) return <Alert>{err}</Alert>
  if (!recipe) return <Spinner label="Loading recipe…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
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

      {shareUrl && (
        <Card className="bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-900 mb-1">Share link:</p>
          <code className="text-xs break-all text-emerald-800">{shareUrl}</code>
        </Card>
      )}

      <RecipeBody recipe={recipe} />
    </div>
  )
}
