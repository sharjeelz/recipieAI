import { useEffect, useRef, useState } from 'react'

/**
 * Cooking buddy — a tiny italian-mochi chef who lives in the corner of cook
 * mode. He bobs, blinks, dispenses tips, and acts as the kitchen timer.
 *
 * Props:
 *   tips         — array of recipe-specific tips (optional)
 *   stepIndex    — current step index; changes trigger a celebratory line
 *   stepCount    — total steps
 *   timer        — null when no timer; otherwise:
 *                  { total, remaining, running, done,
 *                    onStart, onPause, onReset }
 */
const ENCOURAGEMENT = [
  'Salt it now. Taste it later.',
  'Mise en place is half the battle.',
  'Heat the pan before the oil. Oil before the food.',
  'A sharp knife is a kind knife.',
  "Don't crowd the pan. Things steam, not sear.",
  'Let the meat rest. It earned it.',
  'Read the next step before you start this one.',
  'Acid wakes a dish up. A squeeze of lemon, a splash of vinegar.',
  'Taste as you go. Adjust at the end.',
  'A clean kitchen cooks faster.',
  'When in doubt, more butter.',
  'Low and slow is rarely wrong.',
]

const TRANSITIONS = [
  'Onward.',
  'You got this.',
  'Bellissimo.',
  'Good. Keep going.',
  'Bene, bene.',
]

const TIMER_START_LINES = [
  'Tic toc, tic toc.',
  "I'll watch the clock.",
  'Use this time. Tidy as you go.',
]

const DONE_LINES = [
  'Suono! The bell!',
  "It's ready, ready!",
  'Time! Vieni!',
]

const NEAR_END_LINES = [
  'Almost! Get ready.',
  'Plates out, plates out.',
  'Stand by, stand by.',
]

export default function CookingBuddy({
  tips = [],
  stepIndex = 0,
  stepCount = 1,
  timer = null,
}) {
  const [bubble, setBubble] = useState(null) // { id, text, kind }
  const [pose, setPose] = useState('idle') // 'idle' | 'wave' | 'cheer' | 'watch' | 'sweat'
  const seenStepRef = useRef(stepIndex)
  const tipIdxRef = useRef(0)
  const lastTimerStateRef = useRef({ running: false, done: false })
  const calledNearEndRef = useRef(false)

  const timerRunning = !!timer?.running
  const timerDone = !!timer?.done
  const remaining = timer?.remaining ?? 0
  const total = timer?.total ?? 0
  const isLowTime = timerRunning && remaining > 0 && remaining <= 30
  const isVeryLowTime = timerRunning && remaining > 0 && remaining <= 10

  // ── Step transition: cheer briefly + drop a one-liner
  useEffect(() => {
    if (stepIndex !== seenStepRef.current) {
      seenStepRef.current = stepIndex
      const last = stepIndex === stepCount - 1
      const text = last
        ? 'Quasi pronto! Almost there.'
        : pickRandom(TRANSITIONS)
      showBubble(text, 'transition')
      setPose('wave')
      const t = setTimeout(() => setPose('idle'), 1400)
      return () => clearTimeout(t)
    }
  }, [stepIndex, stepCount])

  // ── Timer state machine: react to start, near-end, and done
  useEffect(() => {
    const prev = lastTimerStateRef.current
    lastTimerStateRef.current = { running: timerRunning, done: timerDone }

    if (timerDone && !prev.done) {
      setPose('cheer')
      showBubble(pickRandom(DONE_LINES), 'done', 6000)
      return
    }

    if (timerRunning && !prev.running) {
      // just started
      calledNearEndRef.current = false
      setPose(isLowTime ? 'sweat' : 'watch')
      showBubble(pickRandom(TIMER_START_LINES), 'timer', 3500)
      return
    }

    if (!timerRunning && prev.running && !timerDone) {
      // user paused
      setPose('idle')
    }
  }, [timerRunning, timerDone, isLowTime])

  // ── Pose updates while timer is ticking down
  useEffect(() => {
    if (!timerRunning) return
    setPose(isLowTime ? 'sweat' : 'watch')

    if (isLowTime && !calledNearEndRef.current && remaining <= 30 && remaining > 5) {
      calledNearEndRef.current = true
      showBubble(pickRandom(NEAR_END_LINES), 'timer', 3000)
    }
  }, [timerRunning, isLowTime, remaining])

  // ── Auto-cycle a gentle tip every ~25s when buddy is quiet and idle
  useEffect(() => {
    if (bubble || timerRunning || timerDone) return
    const t = setTimeout(() => {
      const all = combinedTips(tips)
      tipIdxRef.current = (tipIdxRef.current + 1) % all.length
      showBubble(all[tipIdxRef.current], 'tip', 6000)
    }, 25000)
    return () => clearTimeout(t)
  }, [bubble, tips, timerRunning, timerDone])

  function showBubble(text, kind, duration = 4500) {
    const id = Date.now()
    setBubble({ id, text, kind })
    setTimeout(() => {
      setBubble((b) => (b?.id === id ? null : b))
    }, duration)
  }

  function onPoke() {
    // Strict priority: if the recipe has tips, only cycle those.
    // Encouragement is the fallback for tip-less recipes.
    const pool = (tips && tips.length > 0) ? tips : ENCOURAGEMENT
    tipIdxRef.current = (tipIdxRef.current + 1) % pool.length
    showBubble(pool[tipIdxRef.current], 'tip', 6500)
    setPose('wave')
    setTimeout(() => setPose(timerRunning ? (isLowTime ? 'sweat' : 'watch') : 'idle'), 800)
  }

  // Determine what shows in the bubble: live timer overrides text bubble
  // when running so the user sees mm:ss directly.
  const showLiveTime = timerRunning && !bubble

  return (
    <div
      className="fixed z-50 select-none"
      style={{
        left: 'max(1rem, env(safe-area-inset-left))',
        bottom: '7rem',
      }}
    >
      <div className="relative" style={{ width: 'max-content' }}>
        {/* Bubble takes priority when present; otherwise the timer panel
            (when this step has a timer) is the focal element above buddy. */}
        {bubble ? (
          <SpeechBubble text={bubble.text} kind={bubble.kind} />
        ) : timer ? (
          <TimerPanel
            total={timer.total}
            remaining={timer.remaining}
            running={timer.running}
            done={timer.done}
            low={isLowTime}
            veryLow={isVeryLowTime}
            muted={timer.muted}
            onStart={timer.onStart}
            onPause={timer.onPause}
            onReset={timer.onReset}
            onToggleMute={timer.onToggleMute}
          />
        ) : null}

        {/* Buddy himself — always holds the pocket watch */}
        <button
          onClick={onPoke}
          aria-label="Poke the cooking buddy"
          className="block transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-full"
        >
          <BuddyFigure
            pose={pose}
            holdsWatch={true}
            watchActive={timerRunning}
            sweat={isLowTime}
          />
        </button>
      </div>

      {/* Buddy-only animations — kept local so we don't bloat global CSS */}
      <style>{`
        @keyframes buddy-bob {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-3px) rotate(1deg); }
        }
        @keyframes buddy-watch {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-1px) rotate(0deg); }
        }
        @keyframes buddy-wave {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-6px) rotate(4deg); }
        }
        @keyframes buddy-cheer {
          0%, 100% { transform: translateY(0)   rotate(-3deg); }
          25%      { transform: translateY(-10px) rotate(3deg); }
          50%      { transform: translateY(0)   rotate(-3deg); }
          75%      { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes buddy-sweat-bob {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes buddy-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95%, 97%      { transform: scaleY(0.05); }
        }
        @keyframes buddy-arm-tick {
          0%, 100% { transform: rotate(0deg); }
          50%      { transform: rotate(-12deg); }
        }
        @keyframes sweat-drop {
          0%   { opacity: 0; transform: translateY(0) scale(0.6); }
          20%  { opacity: 1; }
          80%  { opacity: 1; transform: translateY(8px) scale(1); }
          100% { opacity: 0; transform: translateY(14px) scale(0.6); }
        }
        @keyframes watch-tick-rotate {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }
        @keyframes bubble-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes time-pulse-low {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        .buddy-pose-idle  { animation: buddy-bob       3.6s ease-in-out infinite; transform-origin: 50% 100%; }
        .buddy-pose-watch { animation: buddy-watch     1.0s steps(2,end)   infinite; transform-origin: 50% 100%; }
        .buddy-pose-wave  { animation: buddy-wave      0.7s ease-in-out 2; transform-origin: 50% 100%; }
        .buddy-pose-cheer { animation: buddy-cheer     0.6s ease-in-out infinite; transform-origin: 50% 100%; }
        .buddy-pose-sweat { animation: buddy-sweat-bob 0.5s ease-in-out infinite; transform-origin: 50% 100%; }
        .buddy-eye        { animation: buddy-blink     5.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .buddy-arm-tick   { animation: buddy-arm-tick  1s steps(2,end) infinite; transform-origin: 18px 78px; transform-box: fill-box; }
        .buddy-sweat-drop { animation: sweat-drop 1.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .watch-second-hand { animation: watch-tick-rotate 60s steps(60,end) infinite; transform-origin: -7px 128px; }
        .time-low { animation: time-pulse-low 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .buddy-pose-idle, .buddy-pose-watch, .buddy-pose-wave,
          .buddy-pose-cheer, .buddy-pose-sweat, .buddy-eye, .buddy-arm-tick,
          .buddy-sweat-drop, .watch-second-hand, .time-low {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   The unified timer panel — appears above the buddy whenever
   the current step has a duration. Combines display + controls
   so nothing overlaps the cook-mode footer below the buddy.
   ────────────────────────────────────────────────────────── */
function TimerPanel({
  total,
  remaining,
  running,
  done,
  low,
  veryLow,
  muted,
  onStart,
  onPause,
  onReset,
  onToggleMute,
}) {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  const ringR = 24
  const ringC = 2 * Math.PI * ringR
  const idle = !running && !done && remaining === total
  const stroke = done ? '#d89b2a' : low ? '#c2452d' : '#fbf7f0'
  const showReset = !idle

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-30%)',
        width: 'max-content',
        animation: 'bubble-in 320ms cubic-bezier(0.2,0.65,0.2,1) both',
      }}
      className={veryLow ? 'time-low' : ''}
    >
      <div
        className="relative flex items-center gap-3 pl-3 pr-2 py-2"
        style={{
          background: done ? '#f5e3bf' : '#1c1815',
          color: done ? '#7a5612' : '#fbf7f0',
          borderRadius: '999px',
          border: '1.5px solid #1c1815',
          boxShadow: '0 4px 0 -1px #1c1815, 0 12px 28px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Ring around the time */}
        <svg width="38" height="38" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0">
          <circle
            cx="28"
            cy="28"
            r={ringR}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3.5"
          />
          <circle
            cx="28"
            cy="28"
            r={ringR}
            fill="none"
            stroke={stroke}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={ringC * (1 - (idle ? 1 : pct))}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '28px 28px',
              transition: 'stroke-dashoffset 1s linear, stroke 240ms',
            }}
          />
        </svg>

        {/* Time + label */}
        <div className="leading-none">
          <div
            className="font-display tnum whitespace-nowrap"
            style={{
              fontSize: '22px',
              fontVariationSettings: '"opsz" 96, "SOFT" 30',
              fontWeight: 500,
            }}
          >
            {format(remaining)}
          </div>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              opacity: 0.55,
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {done ? '· · time' : running ? (low ? 'almost' : 'on the clock') : 'kitchen timer'}
          </div>
        </div>

        {/* Action button */}
        {idle && (
          <button
            onClick={onStart}
            className="ml-1 inline-flex items-center justify-center h-9 px-4 rounded-full bg-terracotta text-paper-soft hover:bg-terracotta-deep transition-colors whitespace-nowrap"
            style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}
          >
            ▶ Start
          </button>
        )}
        {running && (
          <button
            onClick={onPause}
            aria-label="Pause timer"
            className="ml-1 inline-flex items-center justify-center h-9 w-9 rounded-full bg-paper/15 hover:bg-paper/25 transition-colors text-paper"
          >
            ⏸
          </button>
        )}
        {done && (
          <button
            onClick={onStart}
            className="ml-1 inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#d89b2a] text-paper-soft hover:bg-[#b07f1f] transition-colors whitespace-nowrap"
            style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}
          >
            Again
          </button>
        )}
        {showReset && (
          <button
            onClick={onReset}
            aria-label="Reset timer"
            title="Reset"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-paper/10 transition-colors"
            style={{ color: done ? '#7a5612' : 'rgba(251,247,240,0.7)' }}
          >
            ↺
          </button>
        )}
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute timer sound' : 'Mute timer sound'}
            title={muted ? 'Sound off · click to unmute' : 'Sound on · click to mute'}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-paper/10 transition-colors"
            style={{ color: done ? '#7a5612' : 'rgba(251,247,240,0.7)' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}

        {/* tail pointing down at buddy */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '-7px',
            width: '12px',
            height: '12px',
            background: done ? '#f5e3bf' : '#1c1815',
            border: '1.5px solid #1c1815',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }}
        />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   The little chef figure himself.
   ────────────────────────────────────────────────────────── */
function BuddyFigure({ pose, holdsWatch, watchActive, sweat }) {
  const poseClass = `buddy-pose-${pose}`
  return (
    <svg
      viewBox="-15 0 130 145"
      width="108"
      height="120"
      aria-hidden="true"
      className={poseClass}
      style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))', overflow: 'visible' }}
    >
      {/* Sweat drops — only when running low */}
      {sweat && (
        <g>
          <path
            className="buddy-sweat-drop"
            d="M22 50 q-3 4 0 8 q3 -4 0 -8 z"
            fill="#7ec4f0"
            stroke="#1c1815"
            strokeWidth="0.8"
          />
          <path
            className="buddy-sweat-drop"
            style={{ animationDelay: '0.7s' }}
            d="M86 52 q-3 4 0 8 q3 -4 0 -8 z"
            fill="#7ec4f0"
            stroke="#1c1815"
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* Chef's hat — three puffs */}
      <ellipse cx="40" cy="22" rx="13" ry="13" fill="#fbf7f0" stroke="#1c1815" strokeWidth="1.6" />
      <ellipse cx="70" cy="22" rx="13" ry="13" fill="#fbf7f0" stroke="#1c1815" strokeWidth="1.6" />
      <ellipse cx="55" cy="16" rx="14" ry="14" fill="#fbf7f0" stroke="#1c1815" strokeWidth="1.6" />

      {/* Hat band */}
      <rect x="29" y="32" width="52" height="8" rx="2.5" fill="#fbf7f0" stroke="#1c1815" strokeWidth="1.6" />
      <line x1="37" y1="36" x2="73" y2="36" stroke="#d9cfb9" strokeWidth="0.8" />

      {/* Face */}
      <ellipse cx="55" cy="60" rx="22" ry="20" fill="#f4dac2" stroke="#1c1815" strokeWidth="1.6" />

      {/* Eyebrows */}
      <path d="M43 52 Q47 50 51 52" stroke="#1c1815" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M59 52 Q63 50 67 52" stroke="#1c1815" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <g>
        <ellipse className="buddy-eye" cx="47" cy="58" rx="1.8" ry="2.4" fill="#1c1815" />
        <ellipse className="buddy-eye" cx="63" cy="58" rx="1.8" ry="2.4" fill="#1c1815" />
      </g>

      {/* Cheeks */}
      <ellipse cx="41" cy="66" rx="3" ry="2" fill="#c2452d" opacity="0.35" />
      <ellipse cx="69" cy="66" rx="3" ry="2" fill="#c2452d" opacity="0.35" />

      {/* Moustache */}
      <path
        d="M43 70 Q47 74 51 71 Q55 73 59 71 Q63 74 67 70"
        stroke="#1c1815"
        strokeWidth="1.8"
        fill="#1c1815"
        strokeLinejoin="round"
      />

      {/* Smile (or grimace if sweating) */}
      {sweat ? (
        <path
          d="M49 78 Q55 76 61 78"
          stroke="#1c1815"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M49 76 Q55 80 61 76"
          stroke="#1c1815"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Apron / body */}
      <path
        d="M33 84 Q31 100 35 116 L75 116 Q79 100 77 84 Q65 88 55 88 Q45 88 33 84 Z"
        fill="#c2452d"
        stroke="#1c1815"
        strokeWidth="1.6"
      />
      <circle cx="55" cy="91" r="2.4" fill="#1c1815" />
      <path
        d="M45 100 L65 100 L63 110 L47 110 Z"
        fill="#9c3320"
        stroke="#1c1815"
        strokeWidth="1.2"
      />

      {/* Left arm + pocket watch (always present — he is the kitchen timer) */}
      {holdsWatch ? (
        <g>
          {/* arm reaching out to the left */}
          <path
            d="M33 88 Q15 90 -2 90"
            stroke="#1c1815"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          {/* hand */}
          <circle cx="-2" cy="90" r="4.5" fill="#f4dac2" stroke="#1c1815" strokeWidth="1.4" />
          {/* saffron chain — links drawn as a wavy line */}
          <path
            d="M-2 94 Q-4 100 -6 106 Q-8 112 -7 118"
            stroke="#d89b2a"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* tiny chain segments to suggest links */}
          <circle cx="-3" cy="98" r="1.1" fill="none" stroke="#d89b2a" strokeWidth="1" />
          <circle cx="-5" cy="104" r="1.1" fill="none" stroke="#d89b2a" strokeWidth="1" />
          <circle cx="-7" cy="111" r="1.1" fill="none" stroke="#d89b2a" strokeWidth="1" />

          {/* pocket watch — bigger, clearly hanging below his hand */}
          <g>
            {/* gold rim */}
            <circle
              cx="-7"
              cy="128"
              r="13"
              fill="#d89b2a"
              stroke="#1c1815"
              strokeWidth="1.8"
            />
            {/* paper face */}
            <circle
              cx="-7"
              cy="128"
              r="10.5"
              fill="#fbf7f0"
              stroke="#1c1815"
              strokeWidth="1.2"
            />
            {/* hour ticks at 12, 3, 6, 9 */}
            <line x1="-7" y1="119.5" x2="-7" y2="121.5" stroke="#1c1815" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-7" y1="134.5" x2="-7" y2="136.5" stroke="#1c1815" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-15.5" y1="128" x2="-13.5" y2="128" stroke="#1c1815" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-0.5" y1="128" x2="1.5" y2="128" stroke="#1c1815" strokeWidth="1.2" strokeLinecap="round" />
            {/* hour hand — fixed pointing up-right */}
            <line
              x1="-7"
              y1="128"
              x2="-3"
              y2="123"
              stroke="#1c1815"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* second hand — always ticks once per second for "alive" feel */}
            <line
              className="watch-second-hand"
              x1="-7"
              y1="128"
              x2="-7"
              y2="121"
              stroke={watchActive ? '#c2452d' : '#877e72'}
              strokeWidth="1.4"
              strokeLinecap="round"
              style={{ transition: 'stroke 240ms' }}
            />
            {/* hub */}
            <circle cx="-7" cy="128" r="1.6" fill="#1c1815" />
            {/* crown */}
            <rect x="-8.4" y="113.6" width="2.8" height="2.6" rx="0.7" fill="#1c1815" />
            <line x1="-7" y1="116" x2="-7" y2="118" stroke="#1c1815" strokeWidth="1" />
          </g>
        </g>
      ) : null}

      {/* Right arm */}
      <path
        d={
          pose === 'wave' || pose === 'cheer'
            ? 'M77 84 Q92 70 98 56'
            : 'M77 86 Q87 90 91 96'
        }
        stroke="#1c1815"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle
        cx={pose === 'wave' || pose === 'cheer' ? 98 : 91}
        cy={pose === 'wave' || pose === 'cheer' ? 56 : 96}
        r="3.5"
        fill="#f4dac2"
        stroke="#1c1815"
        strokeWidth="1.4"
      />
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────
   Speech bubble (for tips, transitions, done celebrations).
   ────────────────────────────────────────────────────────── */
function SpeechBubble({ text, kind }) {
  const tone =
    kind === 'done'
      ? { bg: '#f5e3bf', ink: '#7a5612' }
      : kind === 'timer'
      ? { bg: '#f2d8ce', ink: '#9c3320' }
      : { bg: '#fbf7f0', ink: '#1c1815' }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 4px)',
        left: '60px',
        width: 'max-content',
        maxWidth: '240px',
        animation: 'bubble-in 320ms cubic-bezier(0.2,0.65,0.2,1) both',
        transformOrigin: 'bottom left',
        zIndex: 1,
      }}
    >
      <div
        className="font-display italic"
        style={{
          background: tone.bg,
          color: tone.ink,
          padding: '10px 14px',
          borderRadius: '14px',
          border: '1.5px solid #1c1815',
          boxShadow: '0 4px 0 -1px #1c1815, 0 12px 28px -12px rgba(0,0,0,0.5)',
          fontSize: '14px',
          lineHeight: 1.4,
          whiteSpace: 'normal',
          wordBreak: 'normal',
          position: 'relative',
        }}
      >
        {text}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '14px',
            bottom: '-9px',
            width: '14px',
            height: '14px',
            background: tone.bg,
            border: '1.5px solid #1c1815',
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'rotate(45deg)',
          }}
        />
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function combinedTips(recipeTips) {
  const list = [...(recipeTips || []), ...ENCOURAGEMENT]
  return list.length ? list : ENCOURAGEMENT
}

function format(sec) {
  const safe = Math.max(0, Math.floor(sec))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
