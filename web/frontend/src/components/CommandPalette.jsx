import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BarChart3, MessageCircle, Bell, TrendingUp, Settings } from 'lucide-react'

const ROUTES = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/trading', label: 'Live Trading', icon: TrendingUp },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/chat', label: 'Chat', icon: MessageCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = ROUTES.filter((r) =>
    r.label.toLowerCase().includes(query.toLowerCase())
  )

  const select = useCallback((path) => {
    navigate(path)
    onClose()
    setQuery('')
  }, [navigate, onClose])

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]"
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 80px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <Search size={18} className="text-white/50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or navigate..."
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm"
            />
            <kbd className="text-[10px] text-white/40 px-2 py-0.5 rounded bg-white/10">ESC</kbd>
          </div>
          <div className="max-h-64 overflow-y-auto py-2">
            {filtered.map((r) => {
              const Icon = r.icon
              return (
                <button
                  key={r.path}
                  onClick={() => select(r.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-white/90 hover:bg-white/5 transition-colors"
                >
                  <Icon size={16} className="text-apex-accent" />
                  {r.label}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-white/40 text-sm">No results.</p>
            )}
          </div>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
