// Use /api when frontend proxies to backend (dev). Override for production.
const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/api'
import toast from 'react-hot-toast'

function getAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ade_token') : null
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function parseErrorResponse(res) {
  const text = await res.text()
  try {
    const j = JSON.parse(text)
    return j.detail || j.message || j.error || text || res.statusText
  } catch (_) {
    if (text && text.length > 150) return 'Server error. Is the backend running?'
    return text || res.statusText
  }
}

async function fetchApi(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error(await parseErrorResponse(res))
    return res.json()
  } catch (e) {
    if (e.message === 'Failed to fetch' || e.name === 'TypeError') {
      throw new Error('Backend unreachable. Run .\\run-backend.ps1 in project root.')
    }
    throw e
  }
}

async function postApi(path, body) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await parseErrorResponse(res))
  return res.json()
}

async function putApi(path, body) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseErrorResponse(res))
  return res.json()
}

async function deleteApi(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: getAuthHeaders() })
  if (!res.ok) throw new Error(await parseErrorResponse(res))
  return res.json()
}

export const api = {
  getHealth: () => fetch(API_BASE + '/health').then((r) => r.ok ? r.json() : null).catch(() => null),
  getPortfolio: () => fetchApi('/portfolio'),
  getTrades: (activeOnly) => fetchApi(activeOnly ? '/trades?active_only=true' : '/trades'),
  runEngine: () => postApi('/trades/run'),
  approveTrade: async (tradeId) => {
    const res = await postApi('/trades/approve', { trade_id: tradeId })
    toast.success('Trade approved')
    return res
  },
  closeTrade: async (tradeId, reason) => {
    const res = await deleteApi(`/trades/${tradeId}?exit_reason=${reason || 'manual'}`)
    toast.success('Trade closed')
    return res
  },
  getAnalytics: () => fetchApi('/analytics'),
  getSignals: () => fetchApi('/signals'),
  getConfig: () => fetchApi('/config'),
  updateConfig: (key, value) => putApi('/config', { key, value }),
  chat: (sessionId, message) => postApi('/chat', { session_id: sessionId, message }),
  getChatHistory: (sessionId) => fetchApi('/chat/history?session_id=' + encodeURIComponent(sessionId)),
  getAlerts: () => fetchApi('/alerts'),
  getNews: () => fetchApi('/news'),
  getCalendar: () => fetchApi('/calendar'),
  screener: (params) => fetchApi('/screener?' + new URLSearchParams(params)),
  getHeatmap: () => fetchApi('/heatmap'),
  getMarketSnapshot: () => fetchApi('/market-snapshot'),
  getQuote: (symbol) => fetchApi('/quote?symbol=' + encodeURIComponent(symbol)),
  getQuotes: (symbols) => fetchApi('/quotes?symbols=' + encodeURIComponent(symbols.join(','))),
  getChart: (symbol, period = '3mo', interval = '1d') =>
    fetchApi('/chart/' + encodeURIComponent(symbol) + '?period=' + encodeURIComponent(period) + '&interval=' + encodeURIComponent(interval)),
  getWatchlists: () => fetchApi('/watchlists'),
  addToWatchlist: async (name, symbol) => {
    const res = await postApi('/watchlists/' + encodeURIComponent(name) + '?symbol=' + encodeURIComponent(symbol))
    toast.success(`${symbol} added to ${name}`)
    return res
  },
  removeFromWatchlist: async (name, symbol) => {
    const res = await deleteApi('/watchlists/' + encodeURIComponent(name) + '/' + encodeURIComponent(symbol))
    toast.success(`${symbol} removed from ${name}`)
    return res
  },
  getPriceAlerts: () => fetchApi('/price-alerts'),
  createPriceAlert: async (body) => {
    const res = await postApi('/price-alerts', body)
    toast.success('Price alert created')
    return res
  },
  deletePriceAlert: async (alertId) => {
    const res = await deleteApi('/price-alerts/' + encodeURIComponent(alertId))
    toast.success('Price alert deleted')
    return res
  },
  exportTrades: () => API_BASE + '/export/trades',
  login: (email, password) => postApi('/auth/login', { email, password }),
  signup: (email, password) => postApi('/auth/signup', { email, password }),
  // MVP signal endpoints
  getSignal: (symbol) => fetchApi('/signals/' + encodeURIComponent(symbol)),
  getMvpSignals: () => fetchApi('/signals/batch/mvp'),
  // Retention tracking
  logEvent: (userId, symbol, action) => postApi('/events', { user_id: userId, symbol, action }),
  getEvents: () => fetchApi('/admin/events'),
  // New Task 3, 4, 5 endpoints
  getMarketRegime: () => fetchApi('/market-regime'),
  recordSignalOutcome: (signalId, outcome) => postApi('/signals/outcome', { signal_id: signalId, outcome }),
  getSignalPerformance: () => fetchApi('/signals/performance'),
  regenerateSignal: (symbol) => fetchApi('/signals/' + encodeURIComponent(symbol)),
}

export function useWebSocket(onMessage) {
  let wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`
  if (import.meta.env.VITE_API_URL) {
    wsUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + '/ws'
  }
  
  // Pass token in query per backend requirement
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('ade_token') : null
  if (token) {
    wsUrl += `?token=${token}`
  }

  const ws = new WebSocket(wsUrl)
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      onMessage?.(data)
    } catch (_) {}
  }
  return ws
}
