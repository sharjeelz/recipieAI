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
    'relative inline-flex items-center px-3 py-2 text-sm tracking-wide transition-colors ' +
    (isActive
      ? 'text-ink'
      : 'text-ink-muted hover:text-ink')

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-paper/80 border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
          <Link to="/app" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display text-2xl leading-none">
              Recipy<span className="italic text-terracotta">AI</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/app" end className={linkClass}>
              {({ isActive }) => (
                <NavLabel active={isActive}>Home</NavLabel>
              )}
            </NavLink>
            <NavLink to="/app/library" className={linkClass}>
              {({ isActive }) => (
                <NavLabel active={isActive}>Library</NavLabel>
              )}
            </NavLink>
            <NavLink to="/app/shopping-list" className={linkClass}>
              {({ isActive }) => (
                <NavLabel active={isActive}>Market</NavLabel>
              )}
            </NavLink>
            <NavLink
              to="/app/settings"
              className={linkClass}
              aria-label="Settings"
              title="Settings"
            >
              {({ isActive }) => (
                <NavLabel active={isActive}>
                  <span aria-hidden="true">⚙</span>
                  <span className="sr-only">Settings</span>
                </NavLabel>
              )}
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:inline text-xs text-ink-muted truncate max-w-[180px]">
                {user.display_name || user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs tracking-widest uppercase text-ink-muted hover:text-terracotta transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10 sm:py-14">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between text-xs text-ink-muted">
          <span>Recipy<span className="italic text-terracotta">AI</span> · Vol. i</span>
          <span className="tnum">© 2026</span>
        </div>
      </footer>
    </div>
  )
}

function NavLabel({ active, children }) {
  return (
    <span className="relative">
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute -left-1 -right-1 -bottom-1 h-px bg-terracotta"
        />
      )}
    </span>
  )
}
