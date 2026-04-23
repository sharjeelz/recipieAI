// Parse a loose quantity string into a number. Returns null if unparseable.
// Handles: "200", "2.5", "1/2", "1 1/2", "2-3" (range → midpoint).
export function parseQuantity(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3]

  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return +frac[1] / +frac[2]

  const range = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/)
  if (range) return (+range[1] + +range[2]) / 2

  const n = Number(s)
  if (Number.isFinite(n)) return n
  return null
}

// Format a number back into a human-friendly quantity string, snapping to
// common fractions when close.
export function formatQuantity(n) {
  if (n == null || !Number.isFinite(n)) return ''
  if (n === 0) return '0'

  const rounded = Math.round(n * 1000) / 1000
  const whole = Math.floor(rounded)
  const frac = rounded - whole

  const common = [
    [0, ''],
    [1 / 8, '1/8'],
    [1 / 4, '1/4'],
    [1 / 3, '1/3'],
    [3 / 8, '3/8'],
    [1 / 2, '1/2'],
    [5 / 8, '5/8'],
    [2 / 3, '2/3'],
    [3 / 4, '3/4'],
    [7 / 8, '7/8'],
    [1, ''],
  ]
  let best = common[0]
  let bestDist = Infinity
  for (const c of common) {
    const d = Math.abs(frac - c[0])
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  if (bestDist < 0.03) {
    const bumpedWhole = best[0] === 1 ? whole + 1 : whole
    const label = best[0] === 1 ? '' : best[1]
    if (bumpedWhole === 0 && label) return label
    if (!label) return String(bumpedWhole)
    return `${bumpedWhole} ${label}`
  }

  if (rounded >= 10) return String(Math.round(rounded))
  return rounded.toFixed(2).replace(/\.?0+$/, '')
}

export function scaleQuantity(raw, factor) {
  const n = parseQuantity(raw)
  if (n == null) return raw
  return formatQuantity(n * factor)
}
