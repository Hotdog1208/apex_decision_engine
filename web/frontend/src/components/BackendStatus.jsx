import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { WifiOff } from 'lucide-react'

export default function BackendStatus() {
  const [online, setOnline] = useState(null) // null = unknown, true = online, false = offline
  const intervalRef = useRef(null)

  useEffect(() => {
    const check = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '/api'
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal })
        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          setOnline(data?.status === 'ok')
        } else {
          setOnline(false)
        }
      } catch (_) {
        setOnline(false)
      }
    }

    check()
    intervalRef.current = setInterval(check, 10000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // Auto-dismiss: only show when confirmed offline
  if (online !== false) return null

  return (
    <div
      className="bg-apex-loss/15 border-b border-apex-loss/30 px-4 py-2.5 flex items-center justify-center gap-3 text-sm z-50 relative"
      role="alert"
      id="offline-banner"
    >
      <WifiOff size={16} className="text-apex-loss shrink-0 animate-pulse" />
      <span className="text-apex-loss font-data text-xs uppercase tracking-widest">
        ADE is running in offline mode — live data unavailable.
      </span>
    </div>
  )
}
