import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Alert, Button, Input } from '../components/ui'
import { AuthLayout } from './Login'

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
    <AuthLayout
      eyebrow="A new entry"
      title="Begin your archive."
      kicker="Open an account"
      footnote={
        <>
          Already have one?{' '}
          <Link to="/login" className="link-grow text-terracotta">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-7">
        {err && <Alert>{err}</Alert>}
        <Input
          label="What should we call you?"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          placeholder="Optional"
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Button type="submit" variant="accent" className="w-full" disabled={busy}>
          {busy ? 'Setting things up…' : 'Open my archive'}
        </Button>
      </form>
    </AuthLayout>
  )
}
