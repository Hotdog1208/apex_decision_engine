// Use /api when frontend proxies to backend (dev). Override for production.
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function fetchApi(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function postApi(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function putApi(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function deleteApi(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
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
  getWatchlists: () => fetchApi('/watchlists'),
  addToWatchlist: (name, symbol) => postApi('/watchlists/' + encodeURIComponent(name) + '?symbol=' + encodeURIComponent(symbol)),
  removeFromWatchlist: (name, symbol) => deleteApi('/watchlists/' + encodeURIComponent(name) + '/' + encodeURIComponent(symbol)),
  getPriceAlerts: () => fetchApi('/price-alerts'),
  createPriceAlert: (body) => postApi('/price-alerts', body),
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
