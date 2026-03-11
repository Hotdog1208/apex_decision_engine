/**
 * Centralized formatting for numbers, currency, and percentages.
 * Use across Dashboard, Analytics, LiveTrading, etc. for consistency.
 */

export function formatCurrency(value, options = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  const { decimals = 0, compact = false } = options
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value, options = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  const { decimals = 2, signed = false } = options
  const formatted = value.toFixed(decimals)
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${formatted}%`
}

export function formatNumber(value, options = {}) {
  if (value == null || Number.isNaN(value)) return '—'
  const { decimals = 0, compact = false } = options
  if (compact && Math.abs(value) >= 1e6) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}
