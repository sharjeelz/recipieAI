import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'

export default function AppHome() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [recent, setRecent] = useState(null)

  useEffect(() => {
    api
      .get('/recipes/mine')
      .then((rows) => setRecent(rows.slice(0, 5)))
      .catch(() => setRecent([]))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { job_id } = await api.post('/recipes', { url })
      navigate(`/app/jobs/${job_id}`)
    } catch (e) {
      setErr(e.message || 'Could not start job')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Paste a YouTube cooking video
        </h1>
        <p className="text-gray-600 mt-1">
          We'll turn it into a structured recipe you can save and share.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          {err && <Alert>{err}</Alert>}
          <Input
            type="url"
            required
            placeholder="https://youtube.com/watch?v=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
          />
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? 'Starting…' : 'Extract recipe'}
          </Button>
        </form>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent</h2>
          <Link to="/app/library" className="text-sm text-emerald-700 hover:underline">
            All recipes →
          </Link>
        </div>
        {recent === null ? (
          <Spinner label="Loading recipes…" />
        ) : recent.length === 0 ? (
          <Card>
            <p className="text-gray-600">
              No recipes yet. Paste a link above to get started.
            </p>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RecipeCard({ recipe }) {
  return (
    <li>
      <Link
        to={`/app/recipes/${recipe.id}`}
        className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-emerald-300 hover:shadow transition"
      >
        <h3 className="font-semibold text-gray-900 line-clamp-2">{recipe.title}</h3>
        {recipe.summary && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recipe.summary}</p>
        )}
        <div className="flex gap-3 mt-3 text-xs text-gray-500">
          {recipe.total_time_min && <span>{recipe.total_time_min} min</span>}
          {recipe.cuisine && <span className="capitalize">{recipe.cuisine}</span>}
          <span className="ml-auto capitalize">{recipe.visibility}</span>
        </div>
      </Link>
    </li>
  )
}
