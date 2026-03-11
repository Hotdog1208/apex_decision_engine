// Use /api when frontend proxies to backend (dev). Override for production.
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
  approveTrade: (tradeId) => postApi('/trades/approve', { trade_id: tradeId }),
  closeTrade: (tradeId, reason) => deleteApi(`/trades/${tradeId}?exit_reason=${reason || 'manual'}`),
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
  addToWatchlist: (name, symbol) => postApi('/watchlists/' + encodeURIComponent(name) + '?symbol=' + encodeURIComponent(symbol)),
  removeFromWatchlist: (name, symbol) => deleteApi('/watchlists/' + encodeURIComponent(name) + '/' + encodeURIComponent(symbol)),
  getPriceAlerts: () => fetchApi('/price-alerts'),
  createPriceAlert: (body) => postApi('/price-alerts', body),
  deletePriceAlert: (alertId) => deleteApi('/price-alerts/' + encodeURIComponent(alertId)),
  exportTrades: () => API_BASE + '/export/trades',
  login: (email, password) => postApi('/auth/login', { email, password }),
  signup: (email, password) => postApi('/auth/signup', { email, password }),
}

export function useWebSocket(onMessage) {
  const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      onMessage?.(data)
    } catch (_) {}
  }
  return ws
}
