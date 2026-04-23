import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Spinner } from './ui'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}
