import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet'

export default function Landing() {
  return (
    <div className="bg-paper text-ink relative overflow-hidden">
      <Helmet>
        <title>RecipyAI — The cook's archive, distilled</title>
        <meta
          name="description"
          content="Turn any cooking video into a clean, structured recipe — saved to your archive, scaled to your servings, and ready when you cook."
        />
      </Helmet>

      {/* === Masthead === */}
      <header className="relative z-10 border-b border-rule">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none tracking-tight">
              Recipy<span className="text-terracotta italic">AI</span>
            </span>
            <span className="hidden sm:inline eyebrow-display">est. 2026</span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm">
            <Link
              to="/login"
              className="px-3 py-2 text-ink-soft hover:text-ink link-grow"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="ml-2 inline-flex items-center justify-center rounded-full bg-ink text-paper px-5 py-2 text-sm font-medium hover:bg-terracotta transition-colors"
            >
              Begin
            </Link>
          </nav>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-14 sm:pt-24 pb-16 sm:pb-28">
          {/* meta line */}
          <div className="flex items-center gap-4 mb-12 sm:mb-16 rise">
            <span className="eyebrow">Volume i · The video issue</span>
            <span className="flex-1 h-px bg-rule rule-draw" />
            <span className="eyebrow tnum">No. 001</span>
          </div>

          <div className="grid grid-cols-12 gap-x-6 sm:gap-x-10 gap-y-10 items-end">
            {/* Headline */}
            <h1 className="col-span-12 lg:col-span-9 display-xl rise delay-1">
              The cook's archive,
              <br />
              <span className="font-display italic" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}>
                distilled
              </span>
              <span className="text-terracotta">.</span>
            </h1>

            {/* Pull quote in the right column */}
            <aside className="col-span-12 lg:col-span-3 lg:pl-6 lg:border-l lg:border-rule rise delay-2">
              <p className="font-display text-[15px] leading-relaxed text-ink-soft">
                A quiet machine that watches what you watch — captions, descriptions,
                audio — and gives back a clean recipe.
              </p>
              <p className="eyebrow-display mt-3">— A note from the kitchen</p>
            </aside>
          </div>

          {/* Lede paragraph + CTAs */}
          <div className="mt-14 sm:mt-20 grid grid-cols-12 gap-x-6 sm:gap-x-10 gap-y-8 items-start">
            <div className="col-span-12 lg:col-span-5 rise delay-3">
              <p className="font-display text-xl sm:text-2xl leading-snug text-ink">
                Paste a link from <span className="italic">YouTube</span>,
                {' '}<span className="italic">TikTok</span>, or{' '}
                <span className="italic">Reels</span>. We listen, we read, we structure.
                <br />
                You cook.
              </p>
            </div>

            <div className="col-span-12 lg:col-span-4 rise delay-4">
              <p className="text-ink-soft leading-relaxed">
                Ingredients with quantities. Steps in order. Tips the chef mentioned
                in passing. Saved to your archive, scaled to your servings, translated
                if you ask.
              </p>
            </div>

            <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 rise delay-5">
              <Link
                to="/register"
                className="group inline-flex items-center justify-between gap-4 rounded-full bg-terracotta text-paper-soft px-6 py-4 hover:bg-terracotta-deep transition-colors"
              >
                <span className="text-[15px] font-medium tracking-wide">
                  Open an account
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper-soft text-terracotta transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-between gap-4 rounded-full border border-ink/15 px-6 py-4 hover:border-ink transition-colors"
              >
                <span className="text-[15px] font-medium tracking-wide">
                  I have an account
                </span>
                <span className="text-ink-muted">↗</span>
              </Link>
            </div>
          </div>
        </div>

        {/* decorative giant numeral */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute -right-6 top-32 select-none pointer-events-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22rem',
            lineHeight: 1,
            fontStyle: 'italic',
            fontWeight: 200,
            color: 'rgba(194, 69, 45, 0.06)',
            fontVariationSettings: '"opsz" 144',
          }}
        >
          01
        </div>
      </section>

      {/* === Sample recipe spread === */}
      <section className="relative bg-paper-deep border-y border-rule">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <div className="flex items-center gap-4 mb-10">
            <span className="font-display italic text-ink-muted tnum">02</span>
            <span className="eyebrow">A specimen page</span>
            <span className="flex-1 h-px bg-rule" />
          </div>

          <div className="grid grid-cols-12 gap-x-6 sm:gap-x-10 gap-y-12">
            {/* Left: title + meta */}
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow-display">Weeknight · Italian</p>
              <h2 className="display-lg mt-3">
                Creamy tuscan{' '}
                <span className="italic" style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
                  chicken
                </span>
              </h2>
              <p className="mt-5 text-ink-soft leading-relaxed max-w-md">
                One pan. Sun-dried tomatoes, baby spinach, a splash of cream. The
                kind of dinner that earns its weight in the rotation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <SpecPill>🍽 4 servings</SpecPill>
                <SpecPill>⏱ 35 min</SpecPill>
                <SpecPill>≈ $0.0042</SpecPill>
              </div>
            </div>

            {/* Right: ingredient + steps preview */}
            <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-x-6 sm:gap-x-10">
              <div>
                <p className="eyebrow mb-4">Ingredients</p>
                <ul className="space-y-3 font-display text-[17px] leading-snug">
                  <Spec qty="4" item="chicken thighs" />
                  <Spec qty="2 tbsp" item="olive oil" />
                  <Spec qty="3 cloves" item="garlic" />
                  <Spec qty="1 cup" item="heavy cream" />
                  <Spec qty="½ cup" item="sun-dried tomatoes" />
                  <Spec qty="2 cups" item="baby spinach" />
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-4">Method</p>
                <ol className="space-y-4">
                  <Step n="01" text="Sear the thighs skin-side down until deeply gold." />
                  <Step n="02" text="Soften garlic in the same pan, off the heat." />
                  <Step n="03" text="Cream, tomatoes, simmer to coat." />
                  <Step n="04" text="Wilt the spinach in. Return chicken." />
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === How it works === */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
          <div className="flex items-center gap-4 mb-12">
            <span className="font-display italic text-ink-muted tnum">03</span>
            <span className="eyebrow">The method</span>
            <span className="flex-1 h-px bg-rule" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            <Method
              numeral="i"
              title="Paste"
              copy="Drop in a link from YouTube, TikTok, or Instagram Reels — short clips welcome."
            />
            <Method
              numeral="ii"
              title="Listen"
              copy="Captions first, the description next, audio if neither was enough. A cheap classifier vets each source before we spend on it."
            />
            <Method
              numeral="iii"
              title="Structure"
              copy="A larger model writes ingredients with quantities, ordered steps, and the tips the chef mentioned in passing."
            />
          </div>
        </div>
      </section>

      {/* === Quote === */}
      <section className="relative bg-ink text-paper">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-24 sm:py-32 text-center">
          <span
            aria-hidden="true"
            className="font-display block text-7xl sm:text-9xl leading-none text-terracotta italic mb-2"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
          >
            &ldquo;
          </span>
          <blockquote className="display-md font-display max-w-3xl mx-auto leading-snug">
            Finally, a quiet way to keep the recipes I cook from the ones I only{' '}
            <span className="italic text-paper-deep">watched</span>.
          </blockquote>
          <p className="eyebrow mt-8 text-paper/60">— Aisha R., food writer</p>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12 flex flex-wrap items-end gap-6 justify-between">
          <div>
            <p className="font-display text-2xl leading-tight">
              Recipy<span className="italic text-terracotta">AI</span>
            </p>
            <p className="text-xs text-ink-muted mt-1">
              A small, careful tool for cooks. © 2026.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-ink-soft">
            <Link to="/login" className="link-grow">Sign in</Link>
            <Link to="/register" className="link-grow">Open account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SpecPill({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-paper-soft border border-rule text-sm text-ink-soft tnum">
      {children}
    </span>
  )
}

function Spec({ qty, item }) {
  return (
    <li className="grid grid-cols-[5rem_1fr] gap-3">
      <span className="text-ink-muted tnum">{qty}</span>
      <span className="text-ink">{item}</span>
    </li>
  )
}

function Step({ n, text }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-3">
      <span className="font-display italic text-terracotta tnum text-sm pt-0.5">
        {n}
      </span>
      <span className="text-ink-soft text-sm leading-relaxed">{text}</span>
    </li>
  )
}

function Method({ numeral, title, copy }) {
  return (
    <article className="border-t border-rule pt-6">
      <div className="flex items-baseline justify-between mb-4">
        <span className="font-display italic text-terracotta text-2xl leading-none">
          {numeral}.
        </span>
        <span className="eyebrow">Step</span>
      </div>
      <h3 className="display-md mb-3">{title}</h3>
      <p className="text-ink-soft leading-relaxed">{copy}</p>
    </article>
  )
}
