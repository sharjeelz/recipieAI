export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-lg font-semibold px-4 py-3 min-h-[44px] transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        className={`w-full rounded-lg border border-gray-300 px-3 py-3 min-h-[44px] text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
        {...props}
      />
      {error && <span className="block text-sm text-red-600 mt-1">{error}</span>}
    </label>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-gray-600">
      <span className="inline-block h-5 w-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function Alert({ children, tone = 'error' }) {
  const tones = {
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  }
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      {children}
    </div>
  )
}
