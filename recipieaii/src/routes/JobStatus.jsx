import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Button, Card } from '../components/ui'
import { findStation } from '../lib/music'

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

  if (job?.status === 'failed') {
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

  const stage = job?.status || 'queued'

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      <PreviewCard job={job} />
      <KitchenHustlePill />
      <ProgressView stage={stage} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   PreviewCard — shows the video's thumbnail + title as soon as
   they're available, so the user has something concrete to look
   at instead of staring at a stage list.
   ──────────────────────────────────────────────────────────── */
function PreviewCard({ job }) {
  const title = job?.title
  const thumb = job?.thumbnail_url
  const sourceUrl = job?.source_url
  const platform = guessPlatform(sourceUrl)
  const [imgErr, setImgErr] = useState(false)
  const showThumb = !!thumb && !imgErr
  const initial = (title || '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <article className="rise overflow-hidden rounded-2xl border border-rule-soft bg-paper-soft shadow-[0_1px_0_rgba(28,24,21,0.04),0_18px_40px_-30px_rgba(28,24,21,0.18)]">
      <div className="relative aspect-video w-full bg-paper-deep overflow-hidden">
        {showThumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, #f2d8ce 0%, #ebe2d2 70%)',
            }}
          >
            <span
              className="font-display italic text-terracotta/70"
              style={{
                fontSize: '6rem',
                lineHeight: 1,
                fontVariationSettings: '"opsz" 144, "SOFT" 100',
              }}
            >
              {title ? initial : '⌛'}
            </span>
          </div>
        )}
        {/* warm overlay so the thumb integrates with the editorial palette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(28,24,21,0) 60%, rgba(28,24,21,0.18) 100%)',
          }}
        />
        {platform && (
          <span className="absolute top-3 left-3 inline-flex items-center font-display italic text-paper-soft text-xs px-2.5 py-1 rounded-full bg-ink/60 backdrop-blur-sm">
            {platform}
          </span>
        )}
      </div>

      <div className="px-5 sm:px-7 py-5 sm:py-6">
        <span className="eyebrow">Now processing</span>
        {title ? (
          <h1 className="display-md mt-3 leading-tight">{title}</h1>
        ) : (
          <p className="font-display italic text-ink-muted text-lg mt-3">
            Pulling the video details…
          </p>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="link-grow inline-flex items-center mt-3 text-xs text-ink-muted tracking-wide max-w-full truncate"
          >
            {prettifyUrl(sourceUrl)} ↗
          </a>
        )}
      </div>
    </article>
  )
}

function guessPlatform(url) {
  if (!url) return null
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube'
  if (u.includes('tiktok.com')) return 'TikTok'
  if (u.includes('instagram.com')) return 'Reels'
  return null
}

function prettifyUrl(url) {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname
  } catch {
    return url
  }
}

/* ────────────────────────────────────────────────────────────
   KitchenHustlePill — small tap-to-play music affordance for
   the wait. Plays SomaFM Sonic Universe (adventurous jazz) via
   the centrally-defined Kitchen Hustle station.
   ──────────────────────────────────────────────────────────── */
function KitchenHustlePill() {
  const station = findStation('kitchenhustle')
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function toggle() {
    setError(false)
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (!audioRef.current) {
      const a = new Audio(station.url)
      a.volume = 0.5
      audioRef.current = a
    }
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setError(true)
        setPlaying(false)
      })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        className="group inline-flex items-center gap-3 rounded-full border border-rule bg-paper-soft px-4 py-2.5 text-sm transition-colors hover:border-ink"
      >
        <span
          className={
            'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ' +
            (playing
              ? 'bg-ink text-paper-soft'
              : 'bg-terracotta text-paper-soft group-hover:bg-terracotta-deep')
          }
        >
          {playing ? '❚❚' : '▶'}
        </span>
        <span className="font-display italic text-ink-soft">
          {playing ? 'Kitchen hustle playing…' : 'Kitchen hustle while you wait?'}
        </span>
      </button>
      {error && (
        <span className="eyebrow text-tomato">stream unavailable</span>
      )}
    </div>
  )
}

function ProgressView({ stage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage)
  const current = STAGES[Math.max(0, currentIndex)]

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="eyebrow">Progress</span>
        <span className="flex-1 h-px bg-rule self-center" />
        <span className="eyebrow tnum">
          {Math.max(0, currentIndex) + 1} / {STAGES.length}
        </span>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl leading-tight">
        {current.label}
        <span
          className="text-terracotta inline-block ml-1"
          style={{ animation: 'blink 1.4s ease-in-out infinite' }}
        >
          .
        </span>
        <span
          className="text-terracotta inline-block ml-1"
          style={{ animation: 'blink 1.4s ease-in-out infinite 0.2s' }}
        >
          .
        </span>
        <span
          className="text-terracotta inline-block ml-1"
          style={{ animation: 'blink 1.4s ease-in-out infinite 0.4s' }}
        >
          .
        </span>
      </h2>
      <p className="font-display italic text-ink-soft mt-1.5">
        {current.detail}
      </p>

      <div className="mt-7 space-y-1">
        {STAGES.map((s, i) => {
          const passed = i < currentIndex
          const active = i === currentIndex
          return (
            <div
              key={s.key}
              className={
                'flex items-center gap-5 py-3 border-b border-rule transition-colors ' +
                (active ? 'opacity-100' : passed ? 'opacity-60' : 'opacity-30')
              }
            >
              <span className="font-display italic text-ink-muted tnum w-8 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-display text-base sm:text-lg flex-1">
                {s.label}
              </span>
              <span className="text-xs text-ink-soft hidden sm:inline">
                {s.detail}
              </span>
              <span className="w-6 text-right shrink-0">
                {passed ? (
                  <span className="text-sage">✓</span>
                ) : active ? (
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-terracotta animate-pulse" />
                ) : (
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-rule" />
                )}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-ink-muted mt-6 leading-relaxed">
        Captioned videos finish in a few seconds. Audio transcription can take up
        to a minute.
      </p>
    </section>
  )
}
