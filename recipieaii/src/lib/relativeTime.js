/**
 * Friendly relative-time formatter.
 *   formatRelativeTime("2026-04-26T10:00:00Z")  →  "5 min ago"
 *
 * Buckets are tuned for a recipe app: granular within the last hour,
 * round numbers up to a year, then "X years ago".
 */
export function formatRelativeTime(input) {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 0) return 'just now'
  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec} sec ago`

  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`

  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} hour${hour === 1 ? '' : 's'} ago`

  const day = Math.floor(hour / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day} days ago`
  if (day < 14) return 'last week'
  if (day < 30) return `${Math.floor(day / 7)} weeks ago`
  if (day < 60) return 'last month'
  if (day < 365) return `${Math.floor(day / 30)} months ago`
  if (day < 730) return 'last year'
  return `${Math.floor(day / 365)} years ago`
}

/**
 * Absolute date as a polished short string ("Apr 26, 2026") for tooltips.
 */
export function formatAbsolute(input) {
  if (!input) return ''
  const date = typeof input === 'string' ? new Date(input) : input
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
