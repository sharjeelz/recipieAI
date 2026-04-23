import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card, Spinner } from '../components/ui'

const LABELS = {
  queued: 'In queue…',
  transcribing: 'Reading the video transcript…',
  structuring: 'Extracting the recipe…',
  done: 'Done!',
  failed: 'Something went wrong',
}

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
      <div className="space-y-4">
        <Alert>{err}</Alert>
        <Link to="/app" className="text-emerald-700 hover:underline">
          ← Back home
        </Link>
      </div>
    )
  }

  if (!job) return <Spinner label="Checking status…" />

  if (job.status === 'failed') {
    return (
      <Card>
        <h2 className="font-semibold text-red-700">Couldn't build this recipe</h2>
        <p className="text-gray-600 text-sm mt-2">
          {job.error || 'The job failed. Try again with a different video.'}
        </p>
        {job.cost_usd != null && job.cost_usd > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Eligibility check cost: ${job.cost_usd.toFixed(4)}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button onClick={() => navigate('/app')}>Try another URL</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="max-w-lg">
      <Card>
        <div className="flex items-center gap-3">
          <Spinner />
          <div>
            <h2 className="font-semibold text-gray-900">Working on it</h2>
            <p className="text-gray-600 text-sm">{LABELS[job.status] || job.status}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          This usually takes a few seconds for videos with captions, or a minute for
          audio-only transcription.
        </p>
      </Card>
    </div>
  )
}
