import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
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
import { Sun, Moon, Command } from 'lucide-react'

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

function AppNav() {
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') return null
  const navClass = ({ isActive }) => `text-sm ${isActive ? 'text-apex-accent' : 'text-white/60 hover:text-white'} transition-colors`
  return (
    <>
      <nav className="border-b border-white/10 bg-apex-darker/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/dashboard" className="text-xl font-display font-bold text-apex-accent tracking-tight">
            APEX
          </NavLink>
          <div className="flex items-center gap-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-colors"
          >
            <Command size={14} />
            <span>⌘K</span>
          </button>
            <NavLink to="/" className="text-sm text-white/60 hover:text-white transition-colors">Home</NavLink>
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/trading" className={navClass}>Live Trading</NavLink>
            <NavLink to="/alerts" className={navClass}>Alerts</NavLink>
            <NavLink to="/news" className={navClass}>News</NavLink>
            <NavLink to="/calendar" className={navClass}>Calendar</NavLink>
            <NavLink to="/charts" className={navClass}>Charts</NavLink>
            <NavLink to="/screener" className={navClass}>Screener</NavLink>
            <NavLink to="/heatmap" className={navClass}>Heatmap</NavLink>
            <NavLink to="/watchlists" className={navClass}>Watchlists</NavLink>
            <NavLink to="/price-alerts" className={navClass}>Price Alerts</NavLink>
            <NavLink to="/risk-tools" className={navClass}>Risk Tools</NavLink>
            <NavLink to="/chat" className={navClass}>Chat</NavLink>
            <NavLink to="/strategies" className={navClass}>Strategies</NavLink>
            <NavLink to="/analytics" className={navClass}>Analytics</NavLink>
            <NavLink to="/settings" className={navClass}>Settings</NavLink>
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
      <div className="min-h-screen bg-apex-darker">
          <AppNav />
          <main className="max-w-7xl mx-auto px-4 py-8">
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
