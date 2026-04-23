import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Spinner } from '../components/ui'

export default function CookMode() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [err, setErr] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)

  const stepCount = recipe?.steps?.length || 0
  const currentStep = recipe?.steps?.[stepIndex]

  useEffect(() => {
    api.get(`/recipes/${recipeId}`).then(setRecipe).catch((e) => setErr(e.message))
  }, [recipeId])

  // Screen wake lock — keep the phone screen on while cooking
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false

    async function acquire() {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) {
          l.release()
          return
        }
        lock = l
      } catch {
        // user denied or unsupported
      }
    }

    acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !lock) acquire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release?.().catch(() => {})
    }
  }, [])

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(stepCount - 1, i + 1))
  }, [stepCount])
  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, navigate])

  if (err) {
    return (
      <div className="min-h-dvh bg-gray-900 text-white p-6">
        <Alert>{err}</Alert>
      </div>
    )
  }
  if (!recipe) {
    return (
      <div className="min-h-dvh bg-gray-900 flex items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    )
  }

  const progress = ((stepIndex + 1) / stepCount) * 100
  const isLast = stepIndex === stepCount - 1

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-300 hover:text-white min-h-[44px] px-2"
        >
          ← Exit
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm text-gray-400 truncate px-4">{recipe.title}</div>
        </div>
        <div className="text-sm text-gray-400 tabular-nums">
          {stepIndex + 1} / {stepCount}
        </div>
      </header>

      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="text-7xl sm:text-8xl font-bold text-emerald-400 mb-8 tabular-nums">
          {stepIndex + 1}
        </div>
        <p className="text-2xl sm:text-3xl leading-relaxed max-w-3xl text-center">
          {currentStep?.text}
        </p>

        {currentStep?.duration_seconds > 0 && (
          <Timer key={`${recipeId}-${stepIndex}`} seconds={currentStep.duration_seconds} />
        )}
      </main>

      <footer className="p-4 grid grid-cols-2 gap-3 border-t border-gray-800">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="h-16 rounded-xl bg-gray-800 text-white font-semibold text-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        {isLast ? (
          <button
            onClick={() => navigate(-1)}
            className="h-16 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700"
          >
            Done ✓
          </button>
        ) : (
          <button
            onClick={goNext}
            className="h-16 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700"
          >
            Next →
          </button>
        )}
      </footer>
    </div>
  )
}

function Timer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const tickRef = useRef(null)

  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
    setDone(false)
  }, [seconds])

  useEffect(() => {
    if (!running) return
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tickRef.current)
          setRunning(false)
          setDone(true)
          try {
            navigator.vibrate?.([300, 120, 300, 120, 300])
          } catch {}
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [running])

  const onReset = () => {
    clearInterval(tickRef.current)
    setRemaining(seconds)
    setRunning(false)
    setDone(false)
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div
        className={
          'text-6xl sm:text-7xl font-mono tabular-nums ' +
          (done ? 'text-red-400 animate-pulse' : 'text-white')
        }
      >
        {format(remaining)}
      </div>
      <div className="flex gap-3">
        {!running && !done && (
          <button
            onClick={() => setRunning(true)}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold min-h-[44px]"
          >
            ▶ Start
          </button>
        )}
        {running && (
          <button
            onClick={() => setRunning(false)}
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold min-h-[44px]"
          >
            ⏸ Pause
          </button>
        )}
        {(running || remaining !== seconds || done) && (
          <button
            onClick={onReset}
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold min-h-[44px]"
          >
            ↺ Reset
          </button>
        )}
      </div>
      {done && <p className="text-red-400 font-semibold">Time's up!</p>}
    </div>
  )
}

function format(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
