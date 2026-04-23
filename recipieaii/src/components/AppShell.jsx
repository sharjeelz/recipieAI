import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="font-bold text-lg text-emerald-700">
            RecipyAI
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/app" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/app/library" className={linkClass}>
              Library
            </NavLink>
            <NavLink to="/app/shopping-list" className={linkClass}>
              Shopping
            </NavLink>
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </nav>
        </div>
        {user && (
          <div className="max-w-4xl mx-auto px-4 pb-2 text-xs text-gray-500 sm:hidden">
            {user.display_name || user.email}
          </div>
        )}
      </header>
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
