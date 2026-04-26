import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      <span className="eyebrow mb-6">A missing page</span>
      <h1
        className="font-display leading-none mb-2"
        style={{
          fontSize: 'clamp(8rem, 24vw, 18rem)',
          fontVariationSettings: '"opsz" 144, "SOFT" 100',
          fontStyle: 'italic',
          fontWeight: 300,
          letterSpacing: '-0.05em',
        }}
      >
        404
      </h1>
      <p className="font-display text-2xl text-ink-soft mb-2">
        We couldn't find that recipe.
      </p>
      <p className="text-ink-muted mb-10 max-w-sm">
        Maybe a typo, maybe the page was retired. Either way, the kitchen is still
        warm.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-3 rounded-full bg-ink text-paper-soft px-7 py-3.5 hover:bg-terracotta transition-colors"
      >
        ← Back to the kitchen
      </Link>
    </div>
  )
}
