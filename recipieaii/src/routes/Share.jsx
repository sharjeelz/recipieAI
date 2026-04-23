import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Spinner } from '../components/ui'
import RecipeBody from '../components/RecipeBody'

export default function Share() {
  const { token } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get(`/share/${token}`).then(setRecipe).catch((e) => setErr(e.message))
  }, [token])

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <Link to="/" className="font-bold text-emerald-700">
          RecipyAI
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {err ? (
          <Alert>{err}</Alert>
        ) : !recipe ? (
          <Spinner label="Loading…" />
        ) : (
          <RecipeBody recipe={recipe} />
        )}
      </main>
    </div>
  )
}
