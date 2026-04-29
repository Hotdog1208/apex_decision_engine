import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const Dashboard    = lazy(() => import('./components/Dashboard'))
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

const LiveTrading     = lazy(() => import('./pages/LiveTrading'))
const Analytics       = lazy(() => import('./pages/Analytics'))
const Strategies      = lazy(() => import('./pages/Strategies'))
const Settings        = lazy(() => import('./pages/Settings'))
const Chat            = lazy(() => import('./pages/Chat'))
const Alerts          = lazy(() => import('./pages/Alerts'))
const News            = lazy(() => import('./pages/News'))
const Calendar        = lazy(() => import('./pages/Calendar'))
const Screener        = lazy(() => import('./pages/Screener'))
const Heatmap         = lazy(() => import('./pages/Heatmap'))
const Watchlists      = lazy(() => import('./pages/Watchlists'))
const PriceAlerts     = lazy(() => import('./pages/PriceAlerts'))
const RiskTools       = lazy(() => import('./pages/RiskTools'))
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword   = lazy(() => import('./pages/ResetPassword'))
const AuthCallback    = lazy(() => import('./pages/AuthCallback'))
const Account         = lazy(() => import('./pages/Account'))
const Pricing         = lazy(() => import('./pages/Pricing'))
const Agent           = lazy(() => import('./pages/Agent'))
const TradeLog        = lazy(() => import('./pages/TradeLog'))
const NotFound        = lazy(() => import('./pages/NotFound'))
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'))

import CommandPalette  from './components/CommandPalette'
import BackendStatus   from './components/BackendStatus'
import NoiseOverlay    from './components/NoiseOverlay'
import GlitchText      from './components/GlitchText'
import OnboardingModal from './components/OnboardingModal'
import PrivateRoute    from './components/PrivateRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import {
  Command, LayoutDashboard, BarChart2, Activity, ChevronDown,
  LogOut, HelpCircle, Award, Menu, X, Circle, Bot, ScrollText,
} from 'lucide-react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const CMD_K_LABEL = isMac ? '⌘K' : 'Ctrl+K'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Signals',      icon: LayoutDashboard },
  { to: '/charts',       label: 'Charts',        icon: BarChart2       },
  { to: '/track-record', label: 'Track Record',  icon: Award           },
  { to: '/agent',        label: 'CIPHER',        icon: Bot,        apexOnly: true },
  { to: '/logs',         label: 'Trade Log',     icon: ScrollText, apexOnly: true },
]

const TIER_STYLE = {
  apex:  { bg: 'rgba(204,255,0,0.12)',   color: '#CCFF00',              border: 'rgba(204,255,0,0.25)'   },
  alpha: { bg: 'rgba(0,212,255,0.10)',   color: '#00D4FF',              border: 'rgba(0,212,255,0.22)'   },
  edge:  { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: 'rgba(255,255,255,0.10)' },
  free:  { bg: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.28)', border: 'rgba(255,255,255,0.06)' },
}

const REGIME_STYLE = {
  BULL:           { color: 'var(--color-profit)',   dot: '#00E879' },
  BEAR:           { color: 'var(--color-loss)',     dot: '#FF2052' },
  HIGH_VOLATILITY:{ color: 'var(--color-warning)',  dot: '#FFB800' },
}

function NavItem({ to, label, icon: Icon, apexOnly }) {
  const { pathname } = useLocation()
  const { tier } = useAuth()
  const isActive = pathname === to || (to !== '/dashboard' && pathname.startsWith(to))
  if (apexOnly && tier !== 'apex') return null

  return (
    <NavLink
      to={to}
      className="relative flex items-center gap-1.5 px-3.5 h-full transition-colors"
      style={{
        fontFamily:    'var(--font-data, monospace)',
        fontSize:      '10px',
        letterSpacing: '0.14em',
        fontWeight:    700,
        textTransform: 'uppercase',
        color: isActive ? (apexOnly ? '#CCFF00' : 'var(--accent-primary)') : (apexOnly ? 'rgba(204,255,0,0.50)' : 'rgba(255,255,255,0.38)'),
      }}
    >
      <Icon size={12} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-underline"
          className="absolute inset-x-0 bottom-0"
          style={{ height: '2px', background: apexOnly ? '#CCFF00' : 'var(--accent-primary)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
    </NavLink>
  )
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = time.getUTCHours().toString().padStart(2, '0')
  const m = time.getUTCMinutes().toString().padStart(2, '0')
  const s = time.getUTCSeconds().toString().padStart(2, '0')
  return (
    <span style={{
      fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
      color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em',
    }}>
      {h}:{m}:{s} UTC
    </span>
  )
}

function AppNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, tier, logout } = useAuth()
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

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  if (['/login', '/signup', '/'].includes(location.pathname)) return null

  const tierKey  = tier || 'free'
  const ts       = TIER_STYLE[tierKey] || TIER_STYLE.free
  const rs       = regime ? (REGIME_STYLE[regime.regime] || REGIME_STYLE.BULL) : null
  const regimeLabel = regime?.regime === 'HIGH_VOLATILITY' ? 'HIGH VOL' : (regime?.regime || '')

  return (
    <>
      <nav
        className="sticky top-0 z-40"
        style={{
          height:              'var(--nav-height, 64px)',
          background:          'rgba(3,5,8,0.92)',
          backdropFilter:      'blur(24px) saturate(160%)',
          WebkitBackdropFilter:'blur(24px) saturate(160%)',
          borderBottom:        '1px solid rgba(255,255,255,0.06)',
          boxShadow:           regime
            ? `0 1px 0 0 ${rs?.dot}22, 0 6px 24px rgba(0,0,0,0.5)`
            : '0 1px 0 0 rgba(255,255,255,0.04), 0 6px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ maxWidth: 'var(--page-max, 1440px)', margin: '0 auto', padding: '0 20px', height: '100%' }}>
          <div className="flex items-center justify-between h-full gap-2">

            {/* Logo */}
            <NavLink to="/dashboard" className="shrink-0 flex items-center gap-2 group mr-4">
              <GlitchText text="APEX" className="text-xl font-display font-black text-apex-accent" />
              <span style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '7px',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.22)', marginTop: '1px',
              }}>
                Decision Engine
              </span>
            </NavLink>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center h-full flex-1">
              {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Upgrade CTA — shown to free/edge users */}
              {user && (tier === 'free' || tier === 'edge') && (
                <NavLink
                  to="/pricing"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 font-bold transition-all hover:opacity-90"
                  style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: 'rgba(204,255,0,0.12)', color: '#CCFF00',
                    border: '1px solid rgba(204,255,0,0.28)',
                  }}
                >
                  ↑ Upgrade
                </NavLink>
              )}

              {/* Live clock */}
              <div className="hidden xl:flex items-center px-2">
                <LiveClock />
              </div>

              {/* Market regime */}
              {regime && rs && (
                <div
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 cursor-help"
                  title={regime.regime_note || ''}
                  style={{
                    fontFamily:    'var(--font-data, monospace)', fontSize: '8px',
                    fontWeight:    700, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color:         rs.color,
                    background:    'rgba(255,255,255,0.03)',
                    border:        '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Circle
                    size={5}
                    fill={rs.dot}
                    style={{ color: rs.dot }}
                    className={regime.regime === 'HIGH_VOLATILITY' ? 'animate-pulse' : ''}
                  />
                  {regimeLabel}
                </div>
              )}

              {/* Cmd+K */}
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 transition-all hover:border-apex-cyan/30 group"
                style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                  color: 'rgba(255,255,255,0.28)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.02)',
                }}
                title={`Terminal (${CMD_K_LABEL})`}
              >
                <Command size={11} className="group-hover:text-apex-cyan transition-colors" />
                <span className="hidden sm:inline">{CMD_K_LABEL}</span>
              </button>

              {/* Help */}
              <button
                onClick={() => setOnboardingOpen(true)}
                className="p-2 transition-colors hover:text-white/60"
                style={{ color: 'rgba(255,255,255,0.22)' }}
                aria-label="Help"
              >
                <HelpCircle size={13} />
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
                        fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                        letterSpacing: '0.10em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.07)',
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <span style={{
                        width: '18px', height: '18px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', background: 'var(--accent-primary)',
                        color: '#000', fontWeight: 900, fontSize: '10px',
                      }}>
                        {user.email[0].toUpperCase()}
                      </span>
                      <span className="hidden md:inline max-w-[80px] truncate">{user.email.split('@')[0]}</span>
                      {tier && tier !== 'free' && (
                        <span
                          className="hidden lg:inline px-1.5 py-0.5"
                          style={{
                            fontFamily: 'var(--font-data, monospace)',
                            fontSize: '7px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                          }}
                        >
                          {tier}
                        </span>
                      )}
                      <ChevronDown size={9} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.13 }}
                          className="absolute top-[calc(100%+6px)] right-0 min-w-[180px] py-1 z-50"
                          style={{ background: '#070A10', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 48px rgba(0,0,0,0.75)' }}
                        >
                          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '8px', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '3px' }}>
                              Signed in
                            </p>
                            <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }} className="truncate">
                              {user.email}
                            </p>
                          </div>
                          {tier === 'apex' && (
                            <NavLink
                              to="/agent"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 w-full px-4 py-2.5 transition-all text-left hover:bg-white/[0.03]"
                              style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CCFF00' }}
                            >
                              <Bot size={11} />
                              CIPHER Agent
                            </NavLink>
                          )}
                          <NavLink
                            to="/account"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 w-full px-4 py-2.5 transition-all text-left hover:bg-white/[0.03]"
                            style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}
                          >
                            Account &amp; Security
                          </NavLink>
                          <button
                            type="button"
                            onClick={() => { logout(); setUserMenuOpen(false); navigate('/') }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 transition-all text-left hover:bg-white/[0.03]"
                            style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,32,82,0.60)' }}
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
                      className="px-3 py-1.5 transition-colors hover:text-white/70"
                      style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      className="px-3 py-1.5 font-bold transition-all hover:bg-white"
                      style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', background: 'var(--accent-primary)', color: '#000' }}
                    >
                      Join
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 transition-colors"
                style={{ color: mobileOpen ? 'var(--accent-primary)' : 'rgba(255,255,255,0.38)' }}
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 w-64 md:hidden flex flex-col"
              style={{ background: 'rgba(3,5,8,0.98)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', height: 'var(--nav-height, 64px)' }}>
                <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '14px', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.02em' }}>APEX</span>
                <button onClick={() => setMobileOpen(false)} style={{ color: 'rgba(255,255,255,0.30)' }}>
                  <X size={15} />
                </button>
              </div>
              <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-4 py-3 transition-all"
                    style={({ isActive }) => ({
                      fontFamily: 'var(--font-data, monospace)',
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color:      isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.45)',
                      background: isActive ? 'rgba(204,255,0,0.05)' : 'transparent',
                      borderLeft: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                    })}
                  >
                    <Icon size={13} />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {user ? (
                  <button
                    onClick={() => { logout(); navigate('/') }}
                    className="flex items-center gap-2 w-full px-3 py-2.5"
                    style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,32,82,0.55)' }}
                  >
                    <LogOut size={11} />
                    Sign out
                  </button>
                ) : (
                  <div className="space-y-2">
                    <NavLink to="/login" className="block text-center py-2.5" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      Login
                    </NavLink>
                    <NavLink to="/signup" className="block text-center py-2.5 font-bold" style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.10em', textTransform: 'uppercase', background: 'var(--accent-primary)', color: '#000' }}>
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

const PAGE_TITLES = {
  '/':               'Apex Decision Engine',
  '/dashboard':      'Signal Hub | ADE',
  '/charts':         'Charts | ADE',
  '/track-record':   'Track Record | ADE',
  '/chat':           'PRISM Chat | ADE',
  '/agent':          'CIPHER Agent | ADE',
  '/account':        'Account | ADE',
  '/pricing':        'Pricing | ADE',
  '/login':          'Sign In | ADE',
  '/signup':         'Join ADE',
  '/forgot-password':'Reset Password | ADE',
  '/privacy':        'Privacy Policy | ADE',
  '/terms':          'Terms of Service | ADE',
  '/risk-disclosure':'Risk Disclosure | ADE',
  '/glossary':       'Glossary | ADE',
  '/faq':            'FAQ | ADE',
  '/disclaimer':     'Disclaimer | ADE',
  '/admin/performance': 'Performance | ADE',
  '/admin':             'Admin Console | ADE',
  '/logs':              'Trade Log | ADE',
}

function TitleUpdater() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] || 'Apex Decision Engine'
  }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <>
      <TitleUpdater />
      <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/auth/callback"   element={<AuthCallback />} />
        <Route path="/pricing"         element={<Pricing />} />

        {/* Legal / info (public) */}
        <Route path="/privacy"         element={<Privacy />} />
        <Route path="/terms"           element={<Terms />} />
        <Route path="/risk-disclosure" element={<RiskDisclosure />} />
        <Route path="/glossary"        element={<Glossary />} />
        <Route path="/faq"             element={<FAQ />} />
        <Route path="/disclaimer"      element={<Disclaimer />} />

        {/* Protected routes — require Supabase session */}
        <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/charts"       element={<PrivateRoute><Charts /></PrivateRoute>} />
        <Route path="/track-record" element={<PrivateRoute><TrackRecord /></PrivateRoute>} />
        <Route path="/chat"         element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/agent"        element={<PrivateRoute><Agent /></PrivateRoute>} />
        <Route path="/logs"         element={<PrivateRoute><TradeLog /></PrivateRoute>} />
        <Route path="/account"      element={<PrivateRoute><Account /></PrivateRoute>} />
        <Route path="/admin/performance" element={<PrivateRoute><PerformancePage /></PrivateRoute>} />
        <Route path="/admin"            element={<AdminDashboard />} />

        <Route path="/trading"      element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/alerts"       element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/news"         element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/calendar"     element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/screener"     element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/heatmap"      element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/watchlists"   element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/price-alerts" element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/risk-tools"   element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/strategies"   element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/analytics"    element={<PrivateRoute><ComingSoon /></PrivateRoute>} />
        <Route path="/settings"     element={<PrivateRoute><ComingSoon /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </AnimatePresence>
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen relative" style={{ background: 'var(--bg-void)' }}>
          <NoiseOverlay />
          {/* Subtle top gradient — lime glow from header */}
          <div className="absolute top-0 left-0 w-full h-[40vh] pointer-events-none z-0"
            style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(204,255,0,0.04) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <BackendStatus />
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'cyber-panel bg-black/90 border border-apex-cyan text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(0,212,255,0.18)]',
                success: { iconTheme: { primary: 'var(--accent-cyan)',  secondary: '#000' } },
                error: {
                  iconTheme: { primary: 'var(--color-loss)', secondary: '#000' },
                  className: 'cyber-panel bg-black/90 border border-apex-loss text-white font-data text-xs uppercase tracking-widest rounded-none shadow-[0_0_20px_rgba(255,32,82,0.18)]',
                },
              }}
            />
            <AppNav />
            <main style={{ maxWidth: 'var(--page-max, 1440px)', margin: '0 auto', padding: '0 20px 40px' }}>
              <Suspense fallback={
                <div style={{ padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-data, monospace)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-cyan)', opacity: 0.6 }}
                  className="animate-pulse">
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
