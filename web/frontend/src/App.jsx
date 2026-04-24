import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const Dashboard = lazy(() => import('./components/Dashboard'))
import { api } from './api'
const Landing        = lazy(() => import('./pages/Landing'))
const Charts         = lazy(() => import('./pages/Charts'))
const Login          = lazy(() => import('./pages/Login'))
const Signup         = lazy(() => import('./pages/Signup'))
const Privacy        = lazy(() => import('./pages/Privacy'))
const Terms          = lazy(() => import('./pages/Terms'))
const RiskDisclosure = lazy(() => import('./pages/RiskDisclosure'))
const Glossary       = lazy(() => import('./pages/Glossary'))
const FAQ            = lazy(() => import('./pages/FAQ'))
const Disclaimer     = lazy(() => import('./pages/Disclaimer'))
const ComingSoon     = lazy(() => import('./pages/ComingSoon'))
const PerformancePage = lazy(() => import('./pages/PerformancePage'))
const TrackRecord    = lazy(() => import('./pages/TrackRecord'))

// Hidden features — preserved, gated with ComingSoon
const LiveTrading  = lazy(() => import('./pages/LiveTrading'))
const Analytics    = lazy(() => import('./pages/Analytics'))
const Strategies   = lazy(() => import('./pages/Strategies'))
const Settings     = lazy(() => import('./pages/Settings'))
const Chat         = lazy(() => import('./pages/Chat'))
const Alerts       = lazy(() => import('./pages/Alerts'))
const News         = lazy(() => import('./pages/News'))
const Calendar     = lazy(() => import('./pages/Calendar'))
const Screener     = lazy(() => import('./pages/Screener'))
const Heatmap      = lazy(() => import('./pages/Heatmap'))
const Watchlists   = lazy(() => import('./pages/Watchlists'))
const PriceAlerts  = lazy(() => import('./pages/PriceAlerts'))
const RiskTools    = lazy(() => import('./pages/RiskTools'))

import CommandPalette  from './components/CommandPalette'
import BackendStatus   from './components/BackendStatus'
import NoiseOverlay    from './components/NoiseOverlay'
import GlitchText      from './components/GlitchText'
import OnboardingModal from './components/OnboardingModal'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import {
  Command, LayoutDashboard, BarChart2, Activity, ChevronDown,
  LogOut, HelpCircle, Award, Menu, X,
} from 'lucide-react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const CMD_K_LABEL = isMac ? '⌘K' : 'Ctrl+K'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Signals',      icon: LayoutDashboard },
  { to: '/charts',       label: 'Charts',        icon: BarChart2       },
  { to: '/track-record', label: 'Track Record',  icon: Award           },
]

const TIER_STYLE = {
  apex:  { bg: 'rgba(204,255,0,0.14)',  color: '#CCFF00',  border: 'rgba(204,255,0,0.28)'  },
  alpha: { bg: 'rgba(0,240,255,0.10)',  color: '#00F0FF',  border: 'rgba(0,240,255,0.22)'  },
  edge:  { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.10)' },
  free:  { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)', border: 'rgba(255,255,255,0.06)' },
}

function NavItem({ to, label, icon: Icon }) {
  const { pathname } = useLocation()
  const isActive = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))

  return (
    <NavLink
      to={to}
      className="relative flex items-center gap-1.5 px-3 transition-colors"
      style={{
        fontFamily:    'var(--font-data, monospace)',
        fontSize:      '10px',
        letterSpacing: '0.12em',
        fontWeight:    700,
        textTransform: 'uppercase',
        color:         isActive ? '#CCFF00' : 'rgba(255,255,255,0.45)',
        height:        'var(--nav-height, 56px)',
      }}
    >
      <Icon size={13} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-underline"
          className="absolute inset-x-0 bottom-0"
          style={{ height: '2px', background: '#CCFF00' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
    </NavLink>
  )
}

function AppNav() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const [commandOpen,    setCommandOpen]    = useState(false)
  const [userMenuOpen,   setUserMenuOpen]   = useState(false)
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [regime,         setRegime]         = useState(null)

  useEffect(() => {
    api.getMarketRegime().then(setRegime).catch(() => {})
  }, [])

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCommandOpen(o => !o) }
      if (e.key === 'Escape') { setUserMenuOpen(false); setMobileOpen(false) }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const close = (e) => { if (!e.target.closest('[data-user-menu]')) setUserMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  if (['/login', '/signup', '/'].includes(location.pathname)) return null

  const tierKey = user?.tier || 'free'
  const ts      = TIER_STYLE[tierKey] || TIER_STYLE.free

  const regimeColor =
    regime?.regime === 'BULL'           ? '#00FF88' :
    regime?.regime === 'BEAR'           ? '#FF0055' :
    regime?.regime === 'HIGH_VOLATILITY'? '#FFEA00' :
    'rgba(255,255,255,0.38)'

  return (
    <>
      <nav
        className="sticky top-0 z-40"
        style={{
          height:             'var(--nav-height, 56px)',
          background:         'rgba(2,2,2,0.88)',
          backdropFilter:     'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderBottom:       '1px solid rgba(255,255,255,0.06)',
          boxShadow:          '0 0 0 1px rgba(204,255,0,0.05), 0 6px 28px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ maxWidth: 'var(--page-max, 1400px)', margin: '0 auto', padding: '0 16px', height: '100%' }}>
          <div className="flex items-center justify-between h-full gap-3">

            {/* Logo */}
            <NavLink to="/dashboard" className="shrink-0 flex items-center gap-2 group">
              <GlitchText text="APEX" className="text-xl font-display font-black text-apex-accent" />
            </NavLink>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center h-full">
              {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 shrink-0">

              {/* Regime pill */}
              {regime && (
                <div
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 cursor-help"
                  style={{
                    fontFamily:    'var(--font-data, monospace)', fontSize: '9px',
                    fontWeight:    700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color:         regimeColor,
                    background:    'rgba(255,255,255,0.03)',
                    border:        '1px solid rgba(255,255,255,0.06)',
                  }}
                  title={regime.regime_note || ''}
                >
                  <Activity size={10} className={regime.regime === 'HIGH_VOLATILITY' ? 'animate-pulse' : ''} />
                  {regime.regime}
                </div>
              )}

              {/* Cmd+K */}
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 transition-colors group"
                style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
                  color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.06)',
                }}
                title={`Terminal (${CMD_K_LABEL})`}
              >
                <Command size={12} className="group-hover:text-apex-cyan transition-colors" />
                <span className="hidden sm:inline" style={{ letterSpacing: '0.10em', textTransform: 'uppercase' }}>{CMD_K_LABEL}</span>
              </button>

              {/* Help */}
              <button
                onClick={() => setOnboardingOpen(true)}
                className="p-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                aria-label="Help"
              >
                <HelpCircle size={14} />
              </button>

              {/* User menu / auth */}
              <div className="relative" data-user-menu>
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen(o => !o)}
                      className="flex items-center gap-2 px-2.5 py-1.5 transition-all"
                      style={{
                        fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className="w-5 h-5 flex items-center justify-center bg-apex-accent text-black font-bold text-[10px]">
                        {user.email[0].toUpperCase()}
                      </span>
                      <span className="hidden md:inline max-w-[90px] truncate">{user.email.split('@')[0]}</span>
                      {user.tier && (
                        <span
                          className="hidden lg:inline px-1.5 py-0.5"
                          style={{
                            fontFamily: 'var(--font-data, monospace)',
                            fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                            background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                          }}
                        >
                          {user.tier}
                        </span>
                      )}
                      <ChevronDown size={10} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.14 }}
                          className="absolute top-[calc(100%+6px)] right-0 min-w-[176px] py-1 z-50"
                          style={{ background: '#070707', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}
                        >
                          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
                              Signed in
                            </p>
                            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.80)' }} className="truncate">
                              {user.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { logout(); setUserMenuOpen(false); navigate('/') }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 transition-all text-left"
                            style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,0,85,0.60)' }}
                          >
                            <LogOut size={11} />
                            Sign out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <NavLink
                      to="/login"
                      className="px-3 py-1.5 transition-colors"
                      style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className="px-3 py-1.5 font-bold transition-all hover:bg-white"
                      style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', background: '#CCFF00', color: '#000' }}
                    >
                      Join
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 transition-colors"
                style={{ color: mobileOpen ? '#CCFF00' : 'rgba(255,255,255,0.40)' }}
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 w-64 md:hidden flex flex-col"
              style={{ background: 'rgba(4,4,4,0.98)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', height: 'var(--nav-height, 56px)' }}>
                <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '14px', fontWeight: 900, color: '#CCFF00', letterSpacing: '0.04em' }}>APEX</span>
                <button onClick={() => setMobileOpen(false)} style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={({ isActive }) => ({
                      fontFamily: 'var(--font-data, monospace)',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color:      isActive ? '#CCFF00' : 'rgba(255,255,255,0.50)',
                      background: isActive ? 'rgba(204,255,0,0.06)' : 'transparent',
                      borderLeft: `2px solid ${isActive ? '#CCFF00' : 'transparent'}`,
                    })}
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {user ? (
                  <button
                    onClick={() => { logout(); navigate('/') }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 transition-colors"
                    style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,0,85,0.60)' }}
                  >
                    <LogOut size={11} />
                    Sign out
                  </button>
                ) : (
                  <div className="space-y-2">
                    <NavLink to="/login" className="block text-center py-2.5 transition-colors" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Login
                    </NavLink>
                    <NavLink to="/signup" className="block text-center py-2.5 font-bold" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', background: '#CCFF00', color: '#000' }}>
                      Join Free
                    </NavLink>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <OnboardingModal forceOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* MVP visible routes */}
        <Route path="/"             element={<Landing />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/signup"       element={<Signup />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/charts"       element={<Charts />} />
        <Route path="/track-record" element={<TrackRecord />} />
        <Route path="/admin/performance" element={<PerformancePage />} />

        {/* Hidden features */}
        <Route path="/trading"      element={<ComingSoon />} />
        <Route path="/chat"         element={<Chat />} />
        <Route path="/alerts"       element={<ComingSoon />} />
        <Route path="/news"         element={<ComingSoon />} />
        <Route path="/calendar"     element={<ComingSoon />} />
        <Route path="/screener"     element={<ComingSoon />} />
        <Route path="/heatmap"      element={<ComingSoon />} />
        <Route path="/watchlists"   element={<ComingSoon />} />
        <Route path="/price-alerts" element={<ComingSoon />} />
        <Route path="/risk-tools"   element={<ComingSoon />} />
        <Route path="/strategies"   element={<ComingSoon />} />
        <Route path="/analytics"    element={<ComingSoon />} />
        <Route path="/settings"     element={<ComingSoon />} />

        {/* Legal */}
        <Route path="/privacy"          element={<Privacy />} />
        <Route path="/terms"            element={<Terms />} />
        <Route path="/risk-disclosure"  element={<RiskDisclosure />} />
        <Route path="/glossary"         element={<Glossary />} />
        <Route path="/faq"              element={<FAQ />} />
        <Route path="/disclaimer"       element={<Disclaimer />} />

        <Route path="*" element={<ComingSoon />} />
      </Routes>
    </AnimatePresence>
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
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'cyber-panel bg-black/90 border border-apex-cyan text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(0,240,255,0.2)]',
                success: { iconTheme: { primary: '#00F0FF', secondary: '#000' } },
                error: {
                  iconTheme: { primary: '#FF0055', secondary: '#000' },
                  className: 'cyber-panel bg-black/90 border border-apex-loss text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(255,0,85,0.2)]',
                },
              }}
            />
            <AppNav />
            <main className="max-w-[1400px] mx-auto px-4 py-8">
              <Suspense fallback={
                <div className="p-20 text-center text-apex-cyan animate-pulse font-data" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Loading...
                </div>
              }>
                <AnimatedRoutes />
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
