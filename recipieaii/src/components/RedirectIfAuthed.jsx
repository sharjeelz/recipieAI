import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Spinner } from './ui'

/**
 * The mirror of RequireAuth: keeps a signed-in user off the sign-in and
 * sign-up screens.
 *
 * Waiting on `loading` matters here. Auth is confirmed by an async
 * /auth/me call, so rendering the form while that's in flight would show
 * a sign-in page to someone already signed in and then yank it away — the
 * exact flash this component exists to prevent.
 */
export default function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (user) {
    // Preserve the deep link that sent them here via RequireAuth, so an
    // expired-session bounce returns to the page they actually wanted.
    const to = location.state?.from || '/app'
    return <Navigate to={to} replace />
  }

  return children
}
