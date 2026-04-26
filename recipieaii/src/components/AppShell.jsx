import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const NAV = [
  { to: '/app', end: true, label: 'Home', icon: '⌂' },
  { to: '/app/library', label: 'Library', icon: '☰' },
  { to: '/app/shopping-list', label: 'Market', icon: '🛒' },
  { to: '/app/settings', label: 'Settings', icon: '⚙' },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-40 backdrop-blur-md bg-paper/85 border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link to="/app" className="flex items-baseline gap-2 shrink-0 min-w-0">
            <span className="font-display text-xl sm:text-2xl leading-none">
              Recipy<span className="italic text-terracotta">AI</span>
            </span>
          </Link>

          {/* Desktop nav — hidden on mobile (we use a bottom bar instead) */}
          <nav className="hidden sm:flex items-center gap-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  'relative inline-flex items-center px-3 py-2 text-sm tracking-wide transition-colors ' +
                  (isActive ? 'text-ink' : 'text-ink-muted hover:text-ink')
                }
                aria-label={item.label}
                title={item.label}
              >
                {({ isActive }) => (
                  <NavLabel active={isActive}>
                    {item.icon === '⚙' ? (
                      <>
                        <span aria-hidden="true">⚙</span>
                        <span className="sr-only">{item.label}</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </NavLabel>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right cluster — user name (md+ only) + sign out */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {user && (
              <span className="hidden md:inline text-xs text-ink-muted truncate max-w-[160px]">
                {user.display_name || user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-ink-muted hover:text-terracotta transition-colors px-2 py-1"
            >
              <span aria-hidden="true" className="text-base leading-none">⏻</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile so the tab bar
          doesn't cover anything */}
      <main className="flex-1 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-14 pb-28 sm:pb-14">
          <Outlet />
        </div>
      </main>

      {/* Desktop footer (hidden on mobile to give the tab bar space) */}
      <footer className="no-print hidden sm:block border-t border-rule">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between text-xs text-ink-muted">
          <span>Recipy<span className="italic text-terracotta">AI</span> · Vol. i</span>
          <span className="tnum">© 2026</span>
        </div>
      </footer>

      {/* Mobile bottom tab bar */}
      <nav
        className="no-print sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-paper/95 border-t border-rule"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ' +
                (isActive ? 'text-terracotta' : 'text-ink-muted hover:text-ink')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className="text-xl leading-none"
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase font-medium">
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-terracotta rounded-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
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
