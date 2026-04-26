import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Alert, Spinner } from '../components/ui'
import CookingBuddy from '../components/CookingBuddy'
import {
  STATIONS,
  findStation,
  loadMusicPrefs,
  resolveStreamUrl,
  saveMusicPrefs,
} from '../lib/music'
import {
  isTimerMuted,
  playAlarm,
  playLowTick,
  playTick,
  setTimerMuted,
} from '../lib/timerSounds'

export default function CookMode() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [err, setErr] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)

  // Timer state — lifted up so the cooking buddy can read it
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [muted, setMuted] = useState(isTimerMuted)
  const tickRef = useRef(null)

  const stepCount = recipe?.steps?.length || 0
  const currentStep = recipe?.steps?.[stepIndex]
  const stepSeconds = currentStep?.duration_seconds || 0
  const hasTimer = stepSeconds > 0

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

  // New step → fresh timer slate (and clear any running interval)
  useEffect(() => {
    clearInterval(tickRef.current)
    setRemaining(stepSeconds)
    setRunning(false)
    setDone(false)
  }, [stepIndex, stepSeconds])

  // Tick — runs while `running` is true. Plays a soft tick each second
  // (low-frequency tock under 10s), and fires the alarm + vibrate on done.
  useEffect(() => {
    if (!running) return
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tickRef.current)
          setRunning(false)
          setDone(true)
          playAlarm()
          try {
            navigator.vibrate?.([300, 120, 300, 120, 300])
          } catch {}
          return 0
        }
        // r > 1 here, so r-1 is the value we'll be at after this tick
        if (r - 1 <= 10) playLowTick()
        else playTick()
        return r - 1
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [running])

  // Toggle mute, persisting to localStorage
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      setTimerMuted(next)
      return next
    })
  }, [])

  const startTimer = useCallback(() => {
    if (!hasTimer) return
    if (done) {
      setRemaining(stepSeconds)
      setDone(false)
    }
    setRunning(true)
  }, [hasTimer, done, stepSeconds])
  const pauseTimer = useCallback(() => setRunning(false), [])
  const resetTimer = useCallback(() => {
    clearInterval(tickRef.current)
    setRemaining(stepSeconds)
    setRunning(false)
    setDone(false)
  }, [stepSeconds])

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
      <div className="min-h-dvh bg-[#1c1815] text-paper p-6">
        <Alert>{err}</Alert>
      </div>
    )
  }
  if (!recipe) {
    return (
      <div className="min-h-dvh bg-[#1c1815] flex items-center justify-center">
        <Spinner label="Pulling the recipe…" tone="paper" />
      </div>
    )
  }

  const progress = ((stepIndex + 1) / stepCount) * 100
  const isLast = stepIndex === stepCount - 1

  return (
    <div
      className="fixed inset-0 flex flex-col text-paper"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(194,69,45,0.1) 0%, rgba(28,24,21,1) 60%), #1c1815',
      }}
    >
      {/* Header */}
      <header className="px-5 sm:px-8 py-4 flex items-center justify-between border-b border-paper/10 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-paper/70 hover:text-paper text-sm tracking-wide min-h-[44px] px-2 transition-colors"
        >
          ← Exit
        </button>
        <div className="flex-1 text-center px-4 min-w-0">
          <p
            className="text-xs uppercase tracking-[0.25em] text-paper/40"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Cooking
          </p>
          <p className="font-display italic text-paper/90 truncate text-base sm:text-lg">
            {recipe.title}
          </p>
        </div>
        <div className="font-display tnum text-paper/70 text-sm">
          {String(stepIndex + 1).padStart(2, '0')}
          <span className="text-paper/30 mx-1">/</span>
          {String(stepCount).padStart(2, '0')}
        </div>
      </header>

      {/* Progress */}
      <div className="h-px bg-paper/10">
        <div
          className="h-full bg-terracotta transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step body */}
      <main
        key={stepIndex}
        className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto rise"
      >
        <span
          className="font-display italic text-terracotta leading-none tnum mb-8"
          style={{
            fontSize: 'clamp(7rem, 18vw, 14rem)',
            fontVariationSettings: '"opsz" 144, "SOFT" 100',
            fontWeight: 200,
          }}
        >
          {String(stepIndex + 1).padStart(2, '0')}
        </span>
        <p
          className="font-display text-2xl sm:text-3xl lg:text-4xl leading-snug max-w-3xl text-center text-paper"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          {currentStep?.text}
        </p>

        {hasTimer && (
          <p className="mt-8 eyebrow text-paper/40">
            ↙ Buddy will time this for you
          </p>
        )}
      </main>

      {/* Floating music player */}
      <MusicPlayer />

      {/* Cooking buddy — kitchen timer + tips */}
      <CookingBuddy
        tips={recipe.tips}
        stepIndex={stepIndex}
        stepCount={stepCount}
        timer={
          hasTimer
            ? {
                total: stepSeconds,
                remaining,
                running,
                done,
                muted,
                onStart: startTimer,
                onPause: pauseTimer,
                onReset: resetTimer,
                onToggleMute: toggleMute,
              }
            : null
        }
      />

      {/* Footer */}
      <footer className="p-4 sm:p-6 grid grid-cols-2 gap-3 border-t border-paper/10">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="h-16 rounded-full border border-paper/20 text-paper/90 font-medium tracking-wide hover:border-paper/60 hover:bg-paper/5 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            onClick={() => navigate(-1)}
            className="h-16 rounded-full bg-sage text-paper font-medium tracking-wide hover:bg-[#4a5a3d] transition-colors"
          >
            ✓ Finish
          </button>
        ) : (
          <button
            onClick={goNext}
            className="h-16 rounded-full bg-terracotta text-paper font-medium tracking-wide hover:bg-terracotta-deep transition-colors"
          >
            Next →
          </button>
        )}
      </footer>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Cook-mode background music — floating widget bottom-right.
   Reads/writes the same localStorage prefs as the Settings page.
   ────────────────────────────────────────────────────────────────── */

function MusicPlayer() {
  const [prefs, setPrefs] = useState(loadMusicPrefs)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState(false)
  const audioRef = useRef(null)

  const station = findStation(prefs.stationId)
  const streamUrl = resolveStreamUrl(prefs)
  const isOff = !streamUrl

  // Persist whenever prefs change
  useEffect(() => {
    saveMusicPrefs(prefs)
  }, [prefs])

  // Manage <audio> lifecycle
  useEffect(() => {
    if (!streamUrl) {
      audioRef.current?.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }

    // Reuse audio element if same URL — avoid restart on volume change.
    if (audioRef.current?.src === streamUrl) {
      audioRef.current.volume = prefs.volume
      return
    }

    audioRef.current?.pause()
    const a = new Audio(streamUrl)
    a.volume = prefs.volume
    audioRef.current = a
    setPlaying(false)
    setError(false)

    return () => {
      a.pause()
      if (audioRef.current === a) audioRef.current = null
    }
  }, [streamUrl])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = prefs.volume
  }, [prefs.volume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function toggle() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => {
          setPlaying(true)
          setError(false)
        })
        .catch(() => {
          setError(true)
          setPlaying(false)
        })
    }
  }

  function nextStation() {
    const playable = STATIONS.filter((s) => s.id !== 'off' && s.id !== 'custom')
    const idx = playable.findIndex((s) => s.id === prefs.stationId)
    const next = playable[(idx + 1) % playable.length] || playable[0]
    setPrefs((p) => ({ ...p, stationId: next.id }))
  }

  function setVolume(v) {
    setPrefs((p) => ({ ...p, volume: v }))
  }

  // Off → don't render the widget at all
  if (isOff) return null

  return (
    <aside
      className={
        'fixed z-50 select-none transition-all duration-300 ' +
        'bottom-24 right-4 sm:bottom-28 sm:right-6 ' +
        (expanded ? 'w-72' : 'w-auto')
      }
    >
      <div
        className="rounded-full backdrop-blur-md border border-paper/15 bg-[#1c1815cc] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]"
        style={expanded ? { borderRadius: '20px' } : undefined}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Play/Pause */}
          <button
            onClick={toggle}
            aria-label={playing ? 'Pause music' : 'Play music'}
            className="shrink-0 h-9 w-9 rounded-full bg-terracotta hover:bg-terracotta-deep text-paper-soft flex items-center justify-center transition-colors"
          >
            {playing ? '❚❚' : '▶'}
          </button>

          {/* Station name (collapsible) */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 min-w-0 text-left px-1"
            aria-expanded={expanded}
          >
            <span className="block font-display italic text-paper text-sm leading-tight truncate">
              {station.label}
            </span>
            <span className="block text-[10px] tracking-widest uppercase text-paper/50 leading-tight">
              {error ? 'stream unavailable' : playing ? '· · on air' : 'paused'}
            </span>
          </button>

          {/* Skip */}
          <button
            onClick={nextStation}
            aria-label="Next station"
            className="shrink-0 h-9 w-9 rounded-full text-paper/70 hover:text-paper hover:bg-paper/10 flex items-center justify-center transition-colors"
            title="Next station"
          >
            ⤳
          </button>
        </div>

        {/* Expanded panel — volume + station picker + settings link */}
        {expanded && (
          <div className="border-t border-paper/10 px-4 py-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] tracking-widest uppercase text-paper/50">
                  Volume
                </span>
                <span className="text-xs text-paper/70 tnum">
                  {Math.round(prefs.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--color-terracotta)' }}
              />
            </div>
            <Link
              to="/app/settings"
              className="block text-center text-[11px] tracking-widest uppercase text-paper/60 hover:text-paper transition-colors py-1"
            >
              ⚙ All stations
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
