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
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl leading-none">
            Recipy<span className="italic text-terracotta">AI</span>
          </Link>
          <Link
            to="/register"
            className="text-sm tracking-wide text-ink-soft hover:text-terracotta link-grow"
          >
            Open your archive →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="mb-8 flex items-baseline gap-4">
          <span className="font-display italic text-ink-muted">a shared entry</span>
          <span className="flex-1 h-px bg-rule" />
        </div>
        {err ? (
          <Alert>{err}</Alert>
        ) : !recipe ? (
          <Spinner label="Pulling the file…" />
        ) : (
          <RecipeBody recipe={recipe} />
        )}
      </main>

      <footer className="border-t border-rule mt-16">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8 flex flex-wrap gap-4 justify-between text-xs text-ink-muted">
          <span>
            Recipy<span className="italic text-terracotta">AI</span> · A small archive for cooks.
          </span>
          <Link to="/" className="link-grow">
            Open your own →
          </Link>
        </div>
      </footer>
    </div>
  )
}
