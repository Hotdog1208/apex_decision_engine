import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import Dashboard from './components/Dashboard'
import LiveTrading from './pages/LiveTrading'
import Analytics from './pages/Analytics'
import Strategies from './pages/Strategies'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import Landing from './pages/Landing'
import Alerts from './pages/Alerts'
import News from './pages/News'
import Calendar from './pages/Calendar'
import Charts from './pages/Charts'
import Screener from './pages/Screener'
import Heatmap from './pages/Heatmap'
import Watchlists from './pages/Watchlists'
import PriceAlerts from './pages/PriceAlerts'
import RiskTools from './pages/RiskTools'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import RiskDisclosure from './pages/RiskDisclosure'
import Glossary from './pages/Glossary'
import FAQ from './pages/FAQ'
import Disclaimer from './pages/Disclaimer'
import CommandPalette from './components/CommandPalette'
import BackendStatus from './components/BackendStatus'
import NoiseOverlay from './components/NoiseOverlay'
import GlitchText from './components/GlitchText'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Sun, Moon, Command, ChevronDown, LayoutDashboard, Zap, MoreHorizontal, Bell, MessageCircle, Shield, Settings as SettingsIcon, LogOut, User } from 'lucide-react'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded text-slate-400 hover:text-white"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

// Single "More" menu: all secondary nav grouped in one dropdown (no cramped bar)
const MORE_SECTIONS = [
  {
    title: 'Research',
    links: [
      { to: '/charts', label: 'Charts' },
      { to: '/screener', label: 'Screener' },
      { to: '/heatmap', label: 'Heatmap' },
      { to: '/news', label: 'News' },
      { to: '/calendar', label: 'Calendar' },
      { to: '/watchlists', label: 'Watchlists' },
    ],
  },
  {
    title: 'Alerts',
    links: [
      { to: '/alerts', label: 'Alert Center' },
      { to: '/price-alerts', label: 'Price Alerts' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { to: '/risk-tools', label: 'Risk Tools' },
      { to: '/chat', label: 'Chat' },
      { to: '/strategies', label: 'Strategies' },
      { to: '/analytics', label: 'Analytics' },
      { to: '/settings', label: 'Settings' },
    ],
  },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const CMD_K_LABEL = isMac ? '⌘K' : 'Ctrl+K'

function AppNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [commandOpen, setCommandOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('[data-nav-dropdown]')) setMoreOpen(false)
      if (!e.target.closest('[data-user-menu]')) setUserMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') return null

  const hasActiveInMore = MORE_SECTIONS.some((s) => s.links.some((l) => location.pathname === l.to))

  return (
    <>
      <nav className="border-b-[3px] border-b-apex-accent/40 glass sticky top-0 z-40 overflow-visible cyber-panel rounded-none shadow-[0_10px_40px_rgba(204,255,0,0.15)] relative">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-apex-accent to-transparent shadow-[0_0_10px_var(--accent-primary)]" />
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4 relative">

            {/* Logo */}
            <NavLink to="/dashboard" className="group text-2xl font-display font-black tracking-tight shrink-0 flex items-center relative overflow-hidden">
              <span className="absolute inset-0 bg-apex-accent text-black flex items-center translate-y-full group-hover:translate-y-0 transition-transform duration-300 font-black px-2 z-10">APEX ENGINE</span>
              <GlitchText text="APEX" className="text-apex-accent px-2" />
            </NavLink>

            <div className="flex items-center gap-2 shrink-0">
              <NavLink to="/" className="hidden sm:inline-flex items-center text-xs uppercase tracking-widest text-white/50 hover:text-apex-accent hover:bg-apex-accent/10 transition-all px-3 py-2 border border-transparent hover:border-apex-accent/30 rounded">
                Home
              </NavLink>

              <NavLink to="/dashboard" className={`px-3 py-2 border rounded transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-bold ${location.pathname === '/dashboard' ? 'text-black bg-apex-accent border-apex-accent shadow-[0_0_15px_var(--accent-primary-muted)]' : 'text-white/60 border-white/5 hover:border-apex-accent/50 hover:text-apex-accent'}`}>
                <LayoutDashboard size={14} className={location.pathname === '/dashboard' ? 'animate-pulse' : ''} />
                Dash
              </NavLink>

              <NavLink to="/trading" className={`px-3 py-2 border rounded transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-bold ${location.pathname === '/trading' ? 'text-black bg-apex-pink border-apex-pink shadow-[0_0_15px_var(--accent-pink-muted)]' : 'text-white/60 border-white/5 hover:border-apex-pink/50 hover:text-apex-pink'}`}>
                <Zap size={14} className={location.pathname === '/trading' ? 'animate-pulse' : ''} />
                Live
              </NavLink>

              <div className="relative" data-nav-dropdown>
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded text-xs uppercase tracking-widest font-bold transition-all ${hasActiveInMore ? 'text-apex-cyan border-apex-cyan/50 shadow-[0_0_10px_var(--accent-cyan-muted)]' : 'text-white/60 border-white/5 hover:border-apex-cyan/50 hover:text-apex-cyan'}`}
                >
                  <MoreHorizontal size={14} />
                  Modules
                  <ChevronDown size={14} className={`transition-transform duration-300 ${moreOpen ? 'rotate-180 text-apex-cyan' : ''}`} />
                </button>
                {moreOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 w-[400px] py-4 px-3 border border-apex-cyan/50 bg-apex-dark/95 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,240,255,0.15)] z-50 grid grid-cols-3 gap-x-4 gap-y-6 before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzQnPjxyZWN0IHdpZHRoPSc0JyBoZWlnaHQ9JzQnIGZpbGw9JyNmZmYnIGZpbGwtb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==')] before:pointer-events-none">
                    {MORE_SECTIONS.map((section) => (
                      <div key={section.title} className="relative z-10">
                        <p className="text-apex-cyan/70 text-[10px] font-data uppercase tracking-[0.2em] mb-3 border-b border-apex-cyan/20 pb-1">{section.title}</p>
                        <div className="space-y-1">
                          {section.links.map((l) => (
                            <button
                              key={l.to}
                              type="button"
                              onClick={() => { navigate(l.to); setMoreOpen(false) }}
                              className={`w-full text-left px-3 py-2 text-xs font-data uppercase tracking-wider transition-all border-l-2 ${location.pathname === l.to ? 'text-apex-cyan border-apex-cyan bg-apex-cyan/10' : 'text-white/60 border-transparent hover:border-apex-cyan/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <NavLink to="/settings" className={({ isActive }) => `hidden sm:flex items-center gap-1.5 px-3 py-2 border rounded text-xs uppercase tracking-widest font-bold transition-all ${isActive ? 'text-white border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-white/50 border-white/5 hover:border-white/30 hover:text-white'}`}>
                <SettingsIcon size={14} />
                CFG
              </NavLink>

              <div className="w-[1px] h-8 bg-white/10 mx-2" />

              <div className="relative flex items-center gap-1" data-user-menu>
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((o) => !o)}
                      className="flex items-center gap-2 px-3 py-1.5 border border-white/10 hover:border-apex-accent/50 bg-black/50 transition-all text-xs uppercase tracking-widest text-white/80"
                      title={user.email}
                    >
                      <span className="w-6 h-6 bg-apex-accent flex items-center justify-center text-black font-bold">
                        <User size={12} />
                      </span>
                      <span className="max-w-[120px] truncate hidden md:inline">{user.email.split('@')[0]}</span>
                      <ChevronDown size={12} className={`text-apex-accent ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute top-[calc(100%+8px)] right-0 py-2 min-w-[200px] border border-apex-accent/30 bg-black shadow-[0_10px_40px_rgba(204,255,0,0.1)] z-50">
                        <div className="px-4 py-3 border-b border-white/10 relative overflow-hidden">
                          <div className="absolute inset-0 bg-apex-accent/5 pointer-events-none" />
                          <p className="text-apex-accent/50 text-[10px] font-data uppercase tracking-[0.2em] mb-1">Authenticated</p>
                          <p className="text-white font-data text-xs truncate relative z-10">{user.email}</p>
                        </div>
                        <NavLink to="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest text-white/60 hover:text-apex-accent hover:bg-apex-accent/10 border-l-[3px] border-transparent hover:border-apex-accent transition-all">
                          <SettingsIcon size={12} />
                          System CFG
                        </NavLink>
                        <button type="button" onClick={() => { logout(); setUserMenuOpen(false); navigate('/') }} className="flex items-center gap-2 w-full px-4 py-3 text-xs uppercase tracking-widest text-apex-loss/70 hover:text-apex-loss hover:bg-apex-loss/10 border-l-[3px] border-transparent hover:border-apex-loss transition-all text-left">
                          <LogOut size={12} />
                          Terminate
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <NavLink to="/login" className="px-4 py-2 text-xs font-data uppercase tracking-widest text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-all">
                      Auth
                    </NavLink>
                    <NavLink to="/signup" className="px-4 py-2 text-xs font-data uppercase tracking-widest font-bold bg-apex-accent text-black hover:bg-white hover:text-black hover:shadow-[0_0_20px_var(--accent-primary)] transition-all">
                      Init
                    </NavLink>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-2 px-3 py-2 border border-white/10 hover:border-apex-cyan/50 text-white/40 hover:text-apex-cyan hover:bg-apex-cyan/5 text-xs font-data transition-all shrink-0 group"
                title={`Terminal (${CMD_K_LABEL})`}
              >
                <Command size={14} className="group-hover:animate-pulse" />
                <span className="hidden sm:inline tracking-widest">{CMD_K_LABEL}</span>
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-1" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-apex-darker relative">
          <NoiseOverlay />
          <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-apex-accent/5 to-transparent pointer-events-none z-0" />

          <div className="relative z-10">
            <BackendStatus />
            <AppNav />
            <main className="max-w-[1400px] mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/trading" element={<LiveTrading />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/news" element={<News />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/screener" element={<Screener />} />
                <Route path="/heatmap" element={<Heatmap />} />
                <Route path="/watchlists" element={<Watchlists />} />
                <Route path="/price-alerts" element={<PriceAlerts />} />
                <Route path="/risk-tools" element={<RiskTools />} />
                <Route path="/strategies" element={<Strategies />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/risk-disclosure" element={<RiskDisclosure />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
              </Routes>
            </main>
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

export default AppWithRouter
