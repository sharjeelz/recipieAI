import { useEffect, useRef, useState } from 'react'
import { Button, Card, SectionLabel, Spinner } from '../components/ui'
import { api } from '../lib/api'
import {
  STATIONS,
  loadMusicPrefs,
  saveMusicPrefs,
} from '../lib/music'

export default function Settings() {
  const [prefs, setPrefs] = useState(loadMusicPrefs())
  const [previewing, setPreviewing] = useState(null) // station id currently playing
  const [previewError, setPreviewError] = useState(null) // station id that failed
  const [saved, setSaved] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    saveMusicPrefs(prefs)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1200)
    return () => clearTimeout(t)
  }, [prefs])

  // Stop any preview on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function pickStation(id) {
    setPrefs((p) => ({ ...p, stationId: id }))
  }

  function setCustomUrl(url) {
    setPrefs((p) => ({ ...p, customUrl: url }))
  }

  function setVolume(v) {
    setPrefs((p) => ({ ...p, volume: v }))
    if (audioRef.current) audioRef.current.volume = v
  }

  function preview(station) {
    // Stop any current preview
    audioRef.current?.pause()
    audioRef.current = null
    setPreviewing(null)
    setPreviewError(null)

    const url =
      station.id === 'custom'
        ? (prefs.customUrl || '').trim()
        : station.url
    if (!url) return

    const a = new Audio(url)
    a.volume = prefs.volume
    audioRef.current = a
    a.play()
      .then(() => setPreviewing(station.id))
      .catch(() => {
        // Autoplay blocked, stream offline, or the host refused the
        // request. Say so — a silently dead button is undebuggable.
        setPreviewing(null)
        setPreviewError(station.id)
      })
  }

  function stopPreview() {
    audioRef.current?.pause()
    audioRef.current = null
    setPreviewing(null)
    setPreviewError(null)
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <header>
        <div className="flex items-baseline gap-4 mb-4">
          <span className="font-display italic text-ink-muted tnum">01</span>
          <span className="eyebrow">Personal preferences</span>
          <span className="flex-1 h-px bg-rule" />
          {saved && (
            <span className="eyebrow text-sage">✓ saved</span>
          )}
        </div>
        <h1 className="display-lg">
          Settings &{' '}
          <span
            className="italic"
            style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}
          >
            sundries
          </span>
        </h1>
      </header>

      {/* Music section */}
      <section className="space-y-6">
        <SectionLabel number="02">Cooking music</SectionLabel>

        <p className="font-display italic text-ink-soft text-lg max-w-2xl">
          A station that plays in the background while you're in cook mode.
          Streams are courtesy of SomaFM.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATIONS.map((s) => {
            const active = prefs.stationId === s.id
            const isPreviewing = previewing === s.id
            const isCustom = s.id === 'custom'
            const isOff = s.id === 'off'
            return (
              <li key={s.id}>
                <label
                  className={
                    'group block cursor-pointer rounded-2xl border p-5 transition-all ' +
                    (active
                      ? 'border-ink bg-paper-soft shadow-[0_4px_28px_-12px_rgba(28,24,21,0.18)]'
                      : 'border-rule-soft bg-paper-soft/60 hover:border-ink/30')
                  }
                >
                  <input
                    type="radio"
                    name="station"
                    value={s.id}
                    checked={active}
                    onChange={() => pickStation(s.id)}
                    className="sr-only"
                  />

                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="font-display text-lg leading-tight">
                      {s.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={
                        'shrink-0 mt-1 h-4 w-4 rounded-full border-2 transition-colors ' +
                        (active
                          ? 'bg-terracotta border-terracotta'
                          : 'border-rule group-hover:border-ink/40')
                      }
                    />
                  </div>
                  <p className="text-sm text-ink-soft leading-snug">
                    {s.blurb}
                  </p>
                  {s.via && (
                    <p className="eyebrow mt-3 text-ink-muted">via {s.via}</p>
                  )}

                  {!isOff && !isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        isPreviewing ? stopPreview() : preview(s)
                      }}
                      className="mt-4 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-terracotta hover:text-terracotta-deep transition-colors"
                    >
                      {isPreviewing ? '■ Stop preview' : '▶ Preview'}
                    </button>
                  )}
                  {previewError === s.id && (
                    <p className="mt-2 text-xs text-terracotta">
                      Couldn't reach this stream.
                    </p>
                  )}
                </label>
              </li>
            )
          })}
        </ul>

        {prefs.stationId === 'custom' && (
          <Card className="space-y-3">
            <span className="eyebrow block">Custom stream URL</span>
            <input
              type="url"
              value={prefs.customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/stream.mp3"
              className="w-full bg-transparent border-0 border-b border-rule px-0 py-3 text-base font-display placeholder:text-ink-muted/50 focus:outline-none focus:border-ink transition-colors"
            />
            <p className="text-xs text-ink-muted leading-relaxed">
              Direct MP3 stream URLs work best. The browser plays it with a
              standard <code className="font-mono text-ink-soft">&lt;audio&gt;</code>{' '}
              element.
            </p>
            {prefs.customUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  previewing === 'custom'
                    ? stopPreview()
                    : preview({ id: 'custom' })
                }
              >
                {previewing === 'custom' ? '■ Stop preview' : '▶ Preview'}
              </Button>
            )}
          </Card>
        )}

        {/* Volume */}
        <div className="border-t border-rule pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">Volume</span>
            <span className="font-display tnum text-sm text-ink-soft">
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
            className="w-full accent-terracotta"
            style={{ accentColor: 'var(--color-terracotta)' }}
          />
          <p className="text-xs text-ink-muted mt-2">
            Applies during cook mode. You can also adjust on the fly from the
            cooking screen.
          </p>
        </div>
      </section>

      <SpendSection />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   What the archive has cost — every extraction and translation runs
   paid LLM/transcription calls, and until now nothing surfaced it.
   ────────────────────────────────────────────────────────────────── */

function money(usd) {
  if (usd == null) return '—'
  if (usd === 0) return '$0.00'
  // Sub-cent totals are normal early on; $0.00 would read as "free".
  if (usd < 0.01) return `<$0.01`
  return `$${usd.toFixed(2)}`
}

function preciseMoney(usd) {
  if (usd == null) return '—'
  return `$${usd.toFixed(4)}`
}

function duration(seconds) {
  if (!seconds) return '0m'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function SpendSection() {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api
      .get('/stats')
      .then(setStats)
      .catch((e) => setErr(e.message || 'Could not load usage'))
  }, [])

  return (
    <section className="space-y-6">
      <SectionLabel number="03">What it's cost</SectionLabel>

      <p className="font-display italic text-ink-soft text-lg max-w-2xl">
        Every extraction runs transcription and a language model. Here's the
        running tab.
      </p>

      {err ? (
        <p className="text-sm text-ink-muted">{err}</p>
      ) : !stats ? (
        <Spinner label="Totting up…" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="All time" value={money(stats.spend_usd.total)} />
            <Stat label="This month" value={money(stats.spend_usd.this_month)} />
            <Stat
              label="Per recipe"
              value={
                stats.spend_usd.per_recipe == null
                  ? '—'
                  : preciseMoney(stats.spend_usd.per_recipe)
              }
            />
            <Stat label="Recipes" value={stats.recipes} />
          </div>

          <Card className="space-y-2.5">
            <Row label="Extractions" value={preciseMoney(stats.spend_usd.extraction)} />
            <Row label="Translations" value={preciseMoney(stats.spend_usd.translation)} />
            {stats.jobs.failed > 0 && (
              <Row
                label={`Spent on ${stats.jobs.failed} failed ${
                  stats.jobs.failed === 1 ? 'extraction' : 'extractions'
                }`}
                value={preciseMoney(stats.spend_usd.wasted)}
                muted
              />
            )}
            <div className="border-t border-rule pt-2.5 space-y-2.5">
              <Row
                label="Tokens in / out"
                value={`${stats.tokens.input.toLocaleString()} / ${stats.tokens.output.toLocaleString()}`}
              />
              <Row label="Audio transcribed" value={duration(stats.transcribe_seconds)} />
              <Row label="Translations made" value={stats.translations} />
            </div>
          </Card>
        </>
      )}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-rule-soft bg-paper-soft/60 p-4">
      <span className="eyebrow block text-ink-muted mb-1.5">{label}</span>
      <span className="font-display text-2xl tnum leading-none">{value}</span>
    </div>
  )
}

function Row({ label, value, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={'text-sm ' + (muted ? 'text-ink-muted' : 'text-ink-soft')}>
        {label}
      </span>
      <span
        className={
          'font-display tnum text-sm ' + (muted ? 'text-ink-muted' : 'text-ink')
        }
      >
        {value}
      </span>
    </div>
  )
}
