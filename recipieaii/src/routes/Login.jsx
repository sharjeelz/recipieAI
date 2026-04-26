import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Alert, Button, Input } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email, password)
      const to = location.state?.from || '/app'
      navigate(to, { replace: true })
    } catch (e) {
      setErr(e.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="The kitchen kept your seat."
      kicker="Sign in"
      footnote={
        <>
          New to RecipyAI?{' '}
          <Link to="/register" className="link-grow text-terracotta">
            Open an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-7">
        {err && <Alert>{err}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@kitchen.tld"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" variant="accent" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

function renderKicker(kicker) {
  if (!kicker) return null
  const trimmed = kicker.trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  if (lastSpace === -1) return trimmed
  const head = trimmed.slice(0, lastSpace)
  const tail = trimmed.slice(lastSpace + 1)
  return (
    <>
      {head}{' '}
      <span
        className="italic text-terracotta"
        style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}
      >
        {tail}
      </span>
    </>
  )
}

export function AuthLayout({ eyebrow, title, kicker, children, footnote }) {
  return (
    <div className="min-h-dvh bg-paper text-ink grid lg:grid-cols-12">
      {/* Editorial column */}
      <aside className="lg:col-span-6 relative bg-paper-deep border-b lg:border-b-0 lg:border-r border-rule overflow-hidden">
        <div className="px-8 lg:px-14 py-10 lg:py-16 flex flex-col h-full justify-between">
          <Link to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display text-2xl leading-none">
              Recipy<span className="italic text-terracotta">AI</span>
            </span>
            <span className="eyebrow-display hidden sm:inline">est. 2026</span>
          </Link>

          <div className="my-12 lg:my-0">
            <p className="eyebrow mb-6">{eyebrow}</p>
            <h1 className="display-lg max-w-md">
              {title}
            </h1>
            <p className="mt-6 max-w-md text-ink-soft leading-relaxed">
              A small archive for the videos you've actually cooked from. Keep them,
              scale them, share them.
            </p>
          </div>

          <div className="hidden lg:block">
            <span className="eyebrow">Volume i</span>
            <p className="font-display italic text-ink-muted text-sm mt-1">
              The video issue
            </p>
          </div>
        </div>

        {/* Decorative numeral */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute -right-10 -bottom-12 select-none pointer-events-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20rem',
            lineHeight: 1,
            fontStyle: 'italic',
            fontWeight: 200,
            color: 'rgba(194, 69, 45, 0.07)',
          }}
        >
          ✻
        </div>
      </aside>

      {/* Form column */}
      <main className="lg:col-span-6 flex items-center justify-center px-6 sm:px-10 py-12 lg:py-20">
        <div className="w-full max-w-sm rise">
          <header className="mb-10">
            <span className="eyebrow">Form</span>
            <h2 className="display-lg mt-3 leading-none">
              {renderKicker(kicker)}
            </h2>
          </header>
          {children}
          {footnote && (
            <p className="text-sm text-ink-soft text-center mt-10">
              {footnote}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
