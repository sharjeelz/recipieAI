export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 ' +
    'border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ' +
    'disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap'

  const sizes = {
    sm: 'text-xs px-3.5 py-2 rounded-full min-h-[36px]',
    md: 'text-sm px-5 py-3 rounded-full min-h-[44px]',
    lg: 'text-[15px] px-7 py-3.5 rounded-full min-h-[52px]',
  }

  const variants = {
    primary:
      'bg-ink text-paper border-ink hover:bg-terracotta hover:border-terracotta ' +
      'active:bg-terracotta-deep active:border-terracotta-deep ' +
      'focus-visible:ring-terracotta',
    accent:
      'bg-terracotta text-paper-soft border-terracotta hover:bg-terracotta-deep hover:border-terracotta-deep ' +
      'focus-visible:ring-terracotta',
    secondary:
      'bg-paper-soft text-ink border-rule hover:border-ink hover:bg-paper-deep ' +
      'focus-visible:ring-ink',
    ghost:
      'bg-transparent text-ink border-transparent hover:bg-paper-deep ' +
      'focus-visible:ring-ink',
    danger:
      'bg-tomato text-paper-soft border-tomato hover:bg-[#9a2920] hover:border-[#9a2920] ' +
      'focus-visible:ring-tomato',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || (label ? `f-${label.replace(/\W+/g, '-').toLowerCase()}` : undefined)
  return (
    <label htmlFor={inputId} className="block">
      {label && (
        <span className="block text-xs font-semibold tracking-[0.22em] uppercase text-ink mb-2.5">
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={
          'w-full bg-transparent text-ink placeholder:text-ink-muted/50 ' +
          'border-0 border-b border-rule px-0 py-3 min-h-[44px] text-[17px] ' +
          'focus:outline-none focus:border-ink transition-colors ' +
          (error ? 'border-tomato ' : '') +
          className
        }
        {...props}
      />
      {error && <span className="block text-xs text-tomato mt-1.5">{error}</span>}
    </label>
  )
}

export function Card({ children, className = '', as: As = 'div' }) {
  return (
    <As
      className={
        'bg-paper-soft border border-rule-soft rounded-2xl px-5 py-5 sm:px-6 sm:py-6 ' +
        'shadow-[0_1px_0_rgba(28,24,21,0.04),0_18px_40px_-30px_rgba(28,24,21,0.18)] ' +
        className
      }
    >
      {children}
    </As>
  )
}

export function Spinner({ label, tone = 'ink' }) {
  const colors = {
    ink: 'border-rule border-t-ink text-ink-soft',
    terracotta: 'border-rule border-t-terracotta text-ink-soft',
    paper: 'border-paper/30 border-t-paper text-paper/80',
  }
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className={`inline-block h-4 w-4 border-[1.5px] rounded-full animate-spin ${colors[tone]}`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm tracking-wide text-ink-soft">{label}</span>
      )}
    </div>
  )
}

export function Alert({ children, tone = 'error' }) {
  const tones = {
    error: 'bg-terracotta-soft text-terracotta-deep border-terracotta/30',
    info: 'bg-saffron-soft text-[#7a5612] border-saffron/30',
    success: 'bg-sage-soft text-[#3a4a2c] border-sage/30',
  }
  return (
    <div
      className={`flex gap-2.5 border rounded-xl px-4 py-3 text-sm ${tones[tone]}`}
      role="alert"
    >
      <span className="font-display italic font-medium leading-tight pt-px">
        {tone === 'error' ? '!' : tone === 'success' ? '✓' : 'i'}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  )
}

export function Pill({ children, className = '', tone = 'default', title }) {
  const tones = {
    default: 'bg-paper-deep text-ink-soft border-rule',
    accent: 'bg-terracotta-soft text-terracotta-deep border-terracotta/20',
    sage: 'bg-sage-soft text-[#3a4a2c] border-sage/20',
    saffron: 'bg-saffron-soft text-[#7a5612] border-saffron/30',
  }
  return (
    <span
      title={title}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ' +
        'text-xs tracking-wide ' +
        tones[tone] +
        ' ' +
        className
      }
    >
      {children}
    </span>
  )
}

export function SectionLabel({ number, children }) {
  return (
    <div className="flex items-center gap-3">
      {number && (
        <span className="font-display italic text-ink-muted text-sm tnum">
          {number}
        </span>
      )}
      <span className="eyebrow">{children}</span>
      <span className="flex-1 h-px bg-rule" />
    </div>
  )
}
