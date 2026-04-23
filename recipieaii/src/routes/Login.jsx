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
    <AuthLayout title="Sign in to RecipyAI" subtitle="Pick up where you left off">
      <form onSubmit={onSubmit} className="space-y-4">
        {err && <Alert>{err}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-sm text-gray-600 text-center mt-6">
        New here?{' '}
        <Link to="/register" className="text-emerald-700 font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="px-4 py-4">
        <Link to="/" className="font-bold text-emerald-700">
          ← RecipyAI
        </Link>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1 mb-6">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
