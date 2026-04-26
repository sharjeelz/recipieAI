import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Pill } from '../components/ui'

const STAGES = [
  { key: 'queued', label: 'In queue', detail: 'Waiting for a free station…' },
  { key: 'transcribing', label: 'Listening', detail: 'Reading the transcript' },
  { key: 'structuring', label: 'Composing', detail: 'Writing it into a recipe' },
  { key: 'done', label: 'Plated', detail: 'Your recipe is ready' },
]

export default function JobStatus() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    let timer
    async function tick() {
      try {
        const j = await api.get(`/jobs/${jobId}`)
        if (cancelled) return
        setJob(j)
        if (j.status === 'done' && j.recipe_id) {
          navigate(`/app/recipes/${j.recipe_id}`, { replace: true })
          return
        }
        if (j.status === 'failed') return
        timer = setTimeout(tick, 1500)
      } catch (e) {
        if (!cancelled) setErr(e.message)
      }
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [jobId, navigate])

  if (err) {
    return (
      <div className="space-y-6">
        <Alert>{err}</Alert>
        <Link to="/app" className="link-grow text-terracotta text-sm">
          ← Back to the kitchen
        </Link>
      </div>
    )
  }

  if (!job) {
    return <ProgressView stage="queued" />
  }

  if (job.status === 'failed') {
    return (
      <div className="max-w-2xl space-y-8 rise">
        <header>
          <span className="eyebrow">Couldn't compose</span>
          <h1 className="display-lg mt-4">
            This one didn't{' '}
            <span className="italic text-terracotta">qualify</span>.
          </h1>
        </header>

        <Card className="bg-terracotta-soft border-terracotta/20">
          <p className="font-display italic text-terracotta-deep text-lg leading-snug">
            “{job.error || 'The job failed. Try a different video.'}”
          </p>
        </Card>

        {job.cost_usd != null && job.cost_usd > 0 && (
          <p className="text-xs text-ink-muted">
            Eligibility check ·{' '}
            <span className="tnum">${Number(job.cost_usd).toFixed(4)}</span>
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="accent" onClick={() => navigate('/app')}>
            Try another link
          </Button>
          <Link
            to="/app/library"
            className="inline-flex items-center px-5 py-3 text-sm tracking-wide text-ink-soft hover:text-ink"
          >
            Back to the archive
          </Link>
        </div>
      </div>
    )
  }

  return <ProgressView stage={job.status} />
}

function ProgressView({ stage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage)
  const current = STAGES[Math.max(0, currentIndex)]

  return (
    <div className="max-w-3xl mx-auto py-10 sm:py-16 rise">
      <span className="eyebrow">Composing your recipe</span>
      <h1 className="display-lg mt-4">
        {current.label}
        <span className="text-terracotta inline-block ml-1" style={{ animation: 'blink 1.4s ease-in-out infinite' }}>
          .
        </span>
        <span className="text-terracotta inline-block ml-1" style={{ animation: 'blink 1.4s ease-in-out infinite 0.2s' }}>
          .
        </span>
        <span className="text-terracotta inline-block ml-1" style={{ animation: 'blink 1.4s ease-in-out infinite 0.4s' }}>
          .
        </span>
      </h1>
      <p className="font-display italic text-ink-soft text-lg mt-3">
        {current.detail}
      </p>

      <div className="mt-12 space-y-1">
        {STAGES.map((s, i) => {
          const passed = i < currentIndex
          const active = i === currentIndex
          return (
            <div
              key={s.key}
              className={
                'flex items-center gap-5 py-4 border-b border-rule transition-colors ' +
                (active ? 'opacity-100' : passed ? 'opacity-60' : 'opacity-30')
              }
            >
              <span className="font-display italic text-ink-muted tnum w-10 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-display text-xl flex-1">{s.label}</span>
              <span className="text-sm text-ink-soft hidden sm:inline">
                {s.detail}
              </span>
              <span className="w-6 text-right shrink-0">
                {passed ? (
                  <span className="text-sage">✓</span>
                ) : active ? (
                  <span className="inline-block h-3 w-3 rounded-full bg-terracotta animate-pulse" />
                ) : (
                  <span className="inline-block h-3 w-3 rounded-full border border-rule" />
                )}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-ink-muted mt-10 leading-relaxed">
        Captioned videos are usually done in a few seconds. If we have to listen to
        the audio, give it a minute.
      </p>
    </div>
  )
}
