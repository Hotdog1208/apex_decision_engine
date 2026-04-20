import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { Suspense, lazy } from 'react'

const Dashboard = lazy(() => import('./components/Dashboard'))
import { api } from './api'
const Landing = lazy(() => import('./pages/Landing'))
const Charts = lazy(() => import('./pages/Charts'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const RiskDisclosure = lazy(() => import('./pages/RiskDisclosure'))
const Glossary = lazy(() => import('./pages/Glossary'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const PerformancePage = lazy(() => import('./pages/PerformancePage'))

// Hidden features — code preserved, routes guarded with ComingSoon
const LiveTrading = lazy(() => import('./pages/LiveTrading'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Strategies = lazy(() => import('./pages/Strategies'))
const Settings = lazy(() => import('./pages/Settings'))
const Chat = lazy(() => import('./pages/Chat'))
const Alerts = lazy(() => import('./pages/Alerts'))
const News = lazy(() => import('./pages/News'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Screener = lazy(() => import('./pages/Screener'))
const Heatmap = lazy(() => import('./pages/Heatmap'))
const Watchlists = lazy(() => import('./pages/Watchlists'))
const PriceAlerts = lazy(() => import('./pages/PriceAlerts'))
const RiskTools = lazy(() => import('./pages/RiskTools'))

import CommandPalette from './components/CommandPalette'
import BackendStatus from './components/BackendStatus'
import NoiseOverlay from './components/NoiseOverlay'
import GlitchText from './components/GlitchText'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster, toast } from 'react-hot-toast'
import { Sun, Moon, Command, LayoutDashboard, BarChart2, ChevronDown, LogOut, User } from 'lucide-react'

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

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const CMD_K_LABEL = isMac ? '⌘K' : 'Ctrl+K'

function AppNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [commandOpen, setCommandOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [regime, setRegime] = useState(null)

  useEffect(() => {
    api.getMarketRegime().then(setRegime).catch(() => {})
  }, [])

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('[data-user-menu]')) setUserMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') return null

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
                Signals
              </NavLink>

              <NavLink to="/charts" className={`px-3 py-2 border rounded transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-bold ${location.pathname === '/charts' ? 'text-black bg-apex-cyan border-apex-cyan shadow-[0_0_15px_var(--accent-cyan-muted)]' : 'text-white/60 border-white/5 hover:border-apex-cyan/50 hover:text-apex-cyan'}`}>
                <BarChart2 size={14} className={location.pathname === '/charts' ? 'animate-pulse' : ''} />
                Charts
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

              {regime && (
                <div 
                  className={`hidden lg:flex items-center gap-2 px-3 py-1.5 border font-data text-[10px] font-bold uppercase tracking-widest cursor-help group relative ${
                    regime.regime === 'BULL' ? 'bg-apex-profit/10 border-apex-profit/30 text-apex-profit' :
                    regime.regime === 'BEAR' ? 'bg-apex-loss/10 border-apex-loss/30 text-apex-loss' :
                    regime.regime === 'HIGH_VOLATILITY' ? 'bg-apex-warning/10 border-apex-warning/30 text-apex-warning' :
                    'bg-white/5 border-white/10 text-white/50'
                  }`}
                  title={regime.regime_note}
                >
                  <Activity size={12} className={regime.regime === 'HIGH_VOLATILITY' ? 'animate-pulse' : ''} />
                  <span>Regime: {regime.regime}</span>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-black border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-white/80 text-[11px] leading-relaxed">
                    <p className="font-bold text-white mb-1 uppercase tracking-widest text-[9px]">Market Context</p>
                    {regime.regime_note}
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[9px] uppercase tracking-tighter">
                      <span>SPY vs 200MA: {regime.spy_vs_200ma}%</span>
                      <span>VIX Profile: {regime.vix_level}</span>
                    </div>
                  </div>
                </div>
              )}

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
            <Toaster position="top-right" toastOptions={{
              className: 'cyber-panel bg-black/90 border border-apex-cyan text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(0,240,255,0.2)]',
              success: { iconTheme: { primary: '#00F0FF', secondary: '#000' } },
              error: { iconTheme: { primary: '#FF0055', secondary: '#000' }, className: 'cyber-panel bg-black/90 border border-apex-loss text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(255,0,85,0.2)]' }
            }} />
            <AppNav />
            <main className="max-w-[1400px] mx-auto px-4 py-8">
              <Suspense fallback={<div className="p-20 text-center text-apex-cyan animate-pulse font-data">Loading Route Chunk...</div>}>
                <Routes>
                  {/* MVP visible routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/charts" element={<Charts />} />
                  <Route path="/admin/performance" element={<PerformancePage />} />

                  {/* Hidden features — show ComingSoon placeholder */}
                  <Route path="/trading" element={<ComingSoon />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/alerts" element={<ComingSoon />} />
                  <Route path="/news" element={<ComingSoon />} />
                  <Route path="/calendar" element={<ComingSoon />} />
                  <Route path="/screener" element={<ComingSoon />} />
                  <Route path="/heatmap" element={<ComingSoon />} />
                  <Route path="/watchlists" element={<ComingSoon />} />
                  <Route path="/price-alerts" element={<ComingSoon />} />
                  <Route path="/risk-tools" element={<ComingSoon />} />
                  <Route path="/strategies" element={<ComingSoon />} />
                  <Route path="/analytics" element={<ComingSoon />} />
                  <Route path="/settings" element={<ComingSoon />} />

                  {/* Legal / info pages stay visible */}
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/risk-disclosure" element={<RiskDisclosure />} />
                  <Route path="/glossary" element={<Glossary />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />

                  {/* Catch-all */}
                  <Route path="*" element={<ComingSoon />} />
                </Routes>
              </Suspense>
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
