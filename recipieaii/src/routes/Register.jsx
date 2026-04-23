import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Alert, Button, Input } from '../components/ui'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    try {
      await register(email, password, displayName || null)
      navigate('/app', { replace: true })
    } catch (e) {
      setErr(e.message || 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="px-4 py-4">
        <Link to="/" className="font-bold text-emerald-700">
          ← RecipyAI
        </Link>
      </header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-1 mb-6">Start saving recipes in seconds.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            {err && <Alert>{err}</Alert>}
            <Input
              label="Display name (optional)"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-sm text-gray-600 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
