import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-6">We couldn't find that page.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white font-semibold px-5 py-3 hover:bg-emerald-700"
      >
        Back home
      </Link>
    </div>
  )
}
