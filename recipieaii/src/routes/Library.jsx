import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Card, Spinner } from '../components/ui'

export default function Library() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get('/recipes/mine').then(setRows).catch((e) => setErr(e.message))
  }, [])

  if (err) return <Alert>{err}</Alert>
  if (rows === null) return <Spinner label="Loading…" />

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-gray-600">
          Your library is empty.{' '}
          <Link to="/app" className="text-emerald-700 font-medium hover:underline">
            Add your first recipe
          </Link>
          .
        </p>
      </Card>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Your library</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={`/app/recipes/${r.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-emerald-300 hover:shadow transition"
            >
              <h3 className="font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
              {r.summary && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.summary}</p>
              )}
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                {r.total_time_min && <span>{r.total_time_min} min</span>}
                {r.cuisine && <span className="capitalize">{r.cuisine}</span>}
                <span className="ml-auto capitalize">{r.visibility}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
