import { useState, useEffect } from 'react'
import { api } from '../api'
import { WifiOff, X } from 'lucide-react'

export default function BackendStatus() {
  const [online, setOnline] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => api.getHealth().then((r) => setOnline(!!r?.status)).catch(() => setOnline(false))
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  if (online !== false || dismissed) return null

  return (
    <div className="bg-apex-loss/15 border-b border-apex-loss/30 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-apex-loss">
        <WifiOff size={16} />
        <span>
          Backend offline — run <code className="bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">.\run-fullstack.ps1</code> or <code className="bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">.\run-backend.ps1</code>
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  )
}
