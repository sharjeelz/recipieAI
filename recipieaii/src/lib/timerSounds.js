/**
 * Tick + alarm tones for the kitchen timer. WebAudio-only — no audio files.
 *
 * The AudioContext is lazily created on first use because most browsers
 * require a user gesture before audio can start. We also auto-resume it on
 * each call in case the browser suspended it (e.g. tab switch).
 */
let ctx = null
let muted = false

const KEY = 'recipyai.timerSound.v1'
try {
  muted = localStorage.getItem(KEY) === 'muted'
} catch {
  /* no localStorage */
}

function ensureCtx() {
  if (muted) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function isTimerMuted() {
  return muted
}

export function setTimerMuted(value) {
  muted = !!value
  try {
    localStorage.setItem(KEY, muted ? 'muted' : 'on')
  } catch {
    /* swallow */
  }
}

/** A short, soft "tick" — single click, 30ms decay. */
export function playTick() {
  const c = ensureCtx()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1400, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** A slightly louder "tock" used when time is almost up. */
export function playLowTick() {
  const c = ensureCtx()
  if (!c) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(900, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.08)
}

/**
 * Done buzz — three pulses of an oscillator, like a wind-up kitchen timer
 * bell. ~1.4s total. Returns a stop() function in case caller wants to cut
 * it short.
 */
export function playAlarm() {
  const c = ensureCtx()
  if (!c) return () => {}
  const t = c.currentTime
  const stops = []

  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.45
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'triangle'
    // bell-like two-frequency overlap
    osc.frequency.setValueAtTime(880, start)
    osc.frequency.exponentialRampToValueAtTime(660, start + 0.32)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(start + 0.4)
    stops.push(() => {
      try {
        osc.stop()
      } catch {}
    })

    // shimmer on top
    const high = c.createOscillator()
    const highGain = c.createGain()
    high.type = 'sine'
    high.frequency.setValueAtTime(1320, start)
    highGain.gain.setValueAtTime(0.0001, start)
    highGain.gain.exponentialRampToValueAtTime(0.08, start + 0.015)
    highGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32)
    high.connect(highGain).connect(c.destination)
    high.start(start)
    high.stop(start + 0.34)
    stops.push(() => {
      try {
        high.stop()
      } catch {}
    })
  }

  return () => stops.forEach((fn) => fn())
}
