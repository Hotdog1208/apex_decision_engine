import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Mic, Bell, BarChart2, Zap } from 'lucide-react'
import { api } from '../api'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 4

const ALERT_OPTIONS = [
  { id: 'breakout',        label: 'Breakouts',         desc: 'Price breaks key structure levels' },
  { id: 'uoa',             label: 'Options Flow',      desc: 'Unusual activity detected' },
  { id: 'earnings',        label: 'Earnings setups',   desc: 'Pre-earnings signal alerts' },
  { id: 'sector_rotation', label: 'Sector rotation',   desc: 'Money rotating between sectors' },
  { id: 'regime_change',   label: 'Regime change',     desc: 'Market regime shifts BULL/BEAR' },
]

const COMMON_TICKERS = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META', 'AMD', 'GOOGL']

const panel = {
  background: '#070A10',
  border: '1px solid rgba(204,255,0,0.18)',
  boxShadow: '0 0 60px rgba(204,255,0,0.06), 0 32px 80px rgba(0,0,0,0.85)',
}

export default function ApexOnboarding({ open, onClose, onComplete }) {
  const [step, setStep]             = useState(1)
  const [watchlist, setWatchlist]   = useState([])
  const [tickerInput, setTickerInput] = useState('')
  const [alertTypes, setAlertTypes] = useState(['breakout', 'uoa'])
  const [voiceMode, setVoiceMode]   = useState(false)
  const [briefTime, setBriefTime]   = useState('09:00')
  const [saving, setSaving]         = useState(false)

  const addTicker = (sym) => {
    const s = sym.trim().toUpperCase().slice(0, 5)
    if (s && !watchlist.includes(s) && watchlist.length < 15) {
      setWatchlist(prev => [...prev, s])
    }
    setTickerInput('')
  }

  const toggleAlert = (id) => {
    setAlertTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      await api.saveAgentPreferences({
        watchlist,
        alert_types: alertTypes,
        brief_time: briefTime,
        voice_mode: voiceMode,
        voice_name: 'default',
        onboarding_complete: true,
      })
      toast.success('CIPHER is ready.')
      onComplete?.()
      onClose?.()
    } catch (err) {
      toast.error('Failed to save preferences — ' + (err.message || 'try again'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-lg"
        style={panel}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                color: '#CCFF00', fontWeight: 700,
              }}>
                CIPHER SETUP
              </span>
              <span style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                color: 'rgba(255,255,255,0.20)', letterSpacing: '0.12em',
              }}>
                {step}/{TOTAL_STEPS}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display, sans-serif)', fontSize: '18px',
              fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em',
            }}>
              {step === 1 && 'Welcome to CIPHER'}
              {step === 2 && 'Build your watchlist'}
              {step === 3 && 'Alert preferences'}
              {step === 4 && 'Brief delivery'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.25)' }}
            className="hover:text-white/60 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)' }}>
          <motion.div
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%', background: '#CCFF00' }}
          />
        </div>

        {/* Step content */}
        <div className="px-7 py-6" style={{ minHeight: '260px' }}>
          <AnimatePresence mode="wait">
            {/* Step 1 — Welcome */}
            {step === 1 && (
              <motion.div key="s1"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              >
                <div className="mb-5" style={{
                  background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.12)',
                  padding: '16px 20px',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '12px',
                    color: 'rgba(255,255,255,0.75)', lineHeight: 1.7,
                  }}>
                    "Good. You've upgraded to APEX. I've been waiting.<br />
                    I'm CIPHER — your personal market intelligence agent.<br />
                    Let's get you set up. This takes about 60 seconds."
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
                    color: '#CCFF00', marginTop: '10px', letterSpacing: '0.12em',
                  }}>— CIPHER</p>
                </div>
                <ul className="space-y-2.5">
                  {[
                    { icon: BarChart2, text: 'On-demand intelligence briefs for your watchlist' },
                    { icon: Zap,       text: 'Cross-timeframe signals: scalp through long-term' },
                    { icon: Mic,       text: 'Optional voice mode — speak to CIPHER, hear back' },
                    { icon: Bell,      text: 'Targeted alerts based on what you actually care about' },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3">
                      <Icon size={12} style={{ color: '#CCFF00', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
                        {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Step 2 — Watchlist */}
            {step === 2 && (
              <motion.div key="s2"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              >
                <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.40)', marginBottom: '14px', letterSpacing: '0.06em' }}>
                  Add up to 15 symbols. CIPHER will brief you on these every time.
                </p>

                {/* Add ticker input */}
                <div className="flex gap-2 mb-4">
                  <input
                    value={tickerInput}
                    onChange={e => setTickerInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') addTicker(tickerInput) }}
                    placeholder="TICKER"
                    maxLength={5}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                      color: 'rgba(255,255,255,0.85)', padding: '8px 12px',
                      fontFamily: 'var(--font-data, monospace)', fontSize: '11px', letterSpacing: '0.10em',
                      outline: 'none',
                    }}
                  />
                  <button onClick={() => addTicker(tickerInput)}
                    style={{
                      background: 'rgba(204,255,0,0.12)', border: '1px solid rgba(204,255,0,0.25)',
                      color: '#CCFF00', padding: '8px 14px', cursor: 'pointer',
                    }}>
                    <Plus size={13} />
                  </button>
                </div>

                {/* Quick-add */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {COMMON_TICKERS.map(t => (
                    <button key={t}
                      onClick={() => addTicker(t)}
                      disabled={watchlist.includes(t)}
                      style={{
                        fontFamily: 'var(--font-data, monospace)', fontSize: '9px',
                        letterSpacing: '0.10em', padding: '4px 8px',
                        background: watchlist.includes(t) ? 'rgba(204,255,0,0.10)' : 'rgba(255,255,255,0.04)',
                        border: watchlist.includes(t) ? '1px solid rgba(204,255,0,0.25)' : '1px solid rgba(255,255,255,0.08)',
                        color: watchlist.includes(t) ? '#CCFF00' : 'rgba(255,255,255,0.40)',
                        cursor: watchlist.includes(t) ? 'default' : 'pointer',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Current watchlist */}
                {watchlist.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {watchlist.map(sym => (
                      <div key={sym} className="flex items-center gap-1.5"
                        style={{
                          background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.20)',
                          padding: '4px 10px', fontFamily: 'var(--font-data, monospace)',
                          fontSize: '10px', color: '#CCFF00', letterSpacing: '0.10em',
                        }}>
                        {sym}
                        <button onClick={() => setWatchlist(prev => prev.filter(x => x !== sym))}
                          style={{ color: 'rgba(255,255,255,0.30)' }} className="hover:text-red-400 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {watchlist.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.20)', fontStyle: 'italic' }}>
                    No symbols added — CIPHER will give a general market brief.
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 3 — Alert types */}
            {step === 3 && (
              <motion.div key="s3"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              >
                <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.40)', marginBottom: '14px', letterSpacing: '0.06em' }}>
                  What should CIPHER focus on? Select all that apply.
                </p>
                <div className="space-y-2">
                  {ALERT_OPTIONS.map(opt => {
                    const active = alertTypes.includes(opt.id)
                    return (
                      <button key={opt.id}
                        onClick={() => toggleAlert(opt.id)}
                        className="w-full flex items-center justify-between px-4 py-3 transition-all text-left"
                        style={{
                          background: active ? 'rgba(204,255,0,0.06)' : 'rgba(255,255,255,0.02)',
                          border: active ? '1px solid rgba(204,255,0,0.22)' : '1px solid rgba(255,255,255,0.07)',
                        }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', fontWeight: 700, color: active ? '#CCFF00' : 'rgba(255,255,255,0.65)', letterSpacing: '0.08em' }}>
                            {opt.label}
                          </p>
                          <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', marginTop: '2px' }}>
                            {opt.desc}
                          </p>
                        </div>
                        <div style={{
                          width: '16px', height: '16px', flexShrink: 0,
                          border: active ? '1px solid #CCFF00' : '1px solid rgba(255,255,255,0.15)',
                          background: active ? '#CCFF00' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {active && <div style={{ width: '8px', height: '8px', background: '#000' }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 4 — Delivery preferences */}
            {step === 4 && (
              <motion.div key="s4"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
              >
                <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.40)', marginBottom: '18px', letterSpacing: '0.06em' }}>
                  How should CIPHER deliver your brief?
                </p>

                {/* Voice mode toggle */}
                <div className="mb-5 p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.80)', letterSpacing: '0.08em' }}>
                        Voice mode
                      </p>
                      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', marginTop: '2px' }}>
                        CIPHER speaks your brief. You can respond with your voice.
                      </p>
                    </div>
                    <button
                      onClick={() => setVoiceMode(v => !v)}
                      style={{
                        width: '40px', height: '22px', borderRadius: '11px', position: 'relative', flexShrink: 0,
                        background: voiceMode ? '#CCFF00' : 'rgba(255,255,255,0.10)',
                        border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                      }}>
                      <div style={{
                        position: 'absolute', top: '3px',
                        left: voiceMode ? '21px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: voiceMode ? '#000' : 'rgba(255,255,255,0.60)',
                        transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>
                  {voiceMode && (
                    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: '#CCFF00', letterSpacing: '0.08em' }}>
                      Voice mode enabled — Chrome recommended for best results.
                    </p>
                  )}
                </div>

                {/* Brief time preference */}
                <div className="p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.80)', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Preferred brief time
                  </p>
                  <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.30)', marginBottom: '10px' }}>
                    CIPHER generates on demand — this is a reminder to yourself.
                  </p>
                  <input
                    type="time"
                    value={briefTime}
                    onChange={e => setBriefTime(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.80)', padding: '8px 12px',
                      fontFamily: 'var(--font-data, monospace)', fontSize: '13px', outline: 'none',
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-7 pb-6">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 transition-colors disabled:opacity-20"
            style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)' }}
          >
            <ChevronLeft size={12} /> Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 transition-all hover:opacity-90"
              style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                background: '#CCFF00', color: '#000',
              }}
            >
              Continue <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                background: '#CCFF00', color: '#000',
              }}
            >
              {saving ? 'Activating...' : 'Activate CIPHER'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
