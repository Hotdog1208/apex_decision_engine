import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, Send, Zap, Clock, Settings, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradePrompt from '../components/UpgradePrompt'
import ApexOnboarding from '../components/ApexOnboarding'
import { api } from '../api'
import toast from 'react-hot-toast'

const AGG_LABELS = { 1: 'CNSV', 2: 'BAL', 3: 'STD', 4: 'AGG', 5: 'APEX' }
const AGG_COLORS = { 1: '#00D4FF', 2: '#7DE8A0', 3: '#CCFF00', 4: '#FFB800', 5: '#FF4444' }

// ── Simple inline markdown renderer ─────────────────────────────────────────
function BriefLine({ line }) {
  const s = (style, children) => <span style={style}>{children}</span>

  if (line.startsWith('## ')) {
    return (
      <p style={{
        fontFamily: 'var(--font-data, monospace)', fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: '#CCFF00',
        marginTop: '18px', marginBottom: '6px',
      }}>
        {line.slice(3)}
      </p>
    )
  }
  if (line.startsWith('### ')) {
    return (
      <p style={{
        fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
        marginTop: '14px', marginBottom: '4px',
      }}>
        {line.slice(4)}
      </p>
    )
  }
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.65, marginBottom: '2px', paddingLeft: '12px' }}>
        <span style={{ color: '#CCFF00', marginRight: '6px' }}>›</span>
        {renderInline(line.slice(2))}
      </p>
    )
  }
  if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
    return (
      <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', marginTop: '16px' }}>
        {line.slice(1, -1)}
      </p>
    )
  }
  if (line === '—' || line === '---') {
    return <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
  }
  if (!line.trim()) return <div style={{ height: '8px' }} />

  return (
    <p style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.70, marginBottom: '4px' }}>
      {renderInline(line)}
    </p>
  )
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function BriefDisplay({ content }) {
  if (!content) return null
  const lines = content.split('\n')
  return (
    <div style={{ padding: '4px 0' }}>
      {lines.map((line, i) => <BriefLine key={i} line={line} />)}
    </div>
  )
}

// ── Voice helpers ─────────────────────────────────────────────────────────────
function useSpeech(enabled) {
  const speak = useCallback((text) => {
    if (!enabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[#*_`]/g, '').replace(/\n+/g, '. ')
    const utt = new SpeechSynthesisUtterance(cleanText)
    utt.rate  = 1.0
    utt.pitch = 0.88
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
      || voices.find(v => v.lang === 'en-US' && !v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('en'))
    if (preferred) utt.voice = preferred
    window.speechSynthesis.speak(utt)
  }, [enabled])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  return { speak, stop }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Agent() {
  const { user, tier } = useAuth()
  const [brief, setBrief]                 = useState(null)
  const [briefTs, setBriefTs]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [generating, setGenerating]       = useState(false)
  const [cooldownEnd, setCooldownEnd]     = useState(null)
  const [voiceEnabled, setVoiceEnabled]   = useState(false)
  const [listening, setListening]         = useState(false)
  const [query, setQuery]                 = useState('')
  const [askLoading, setAskLoading]       = useState(false)
  const [conversation, setConversation]   = useState([])
  const [prefs, setPrefs]                 = useState(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [sessionId]                       = useState(() => `cipher-${Date.now()}`)
  const [aggressionLevel, setAggressionLevel] = useState(3)
  const [cipherStats, setCipherStats]     = useState(null)
  const [pendingPositions, setPendingPositions] = useState([])
  const chatEndRef                        = useRef(null)
  const recRef                            = useRef(null)
  const { speak, stop } = useSpeech(voiceEnabled)

  // Gate: APEX only
  if (tier && tier !== 'apex') {
    return (
      <div style={{ paddingTop: '60px' }}>
        <UpgradePrompt requiredTier="apex" feature="CIPHER Agent" />
      </div>
    )
  }

  useEffect(() => {
    if (tier !== 'apex') return
    let cancelled = false

    const init = async () => {
      setLoading(true)
      try {
        const [briefData, prefsData, statsData, pendingData] = await Promise.all([
          api.getAgentBrief(),
          api.getAgentPreferences(),
          api.getCipherStats().catch(() => null),
          api.getPendingPositions().catch(() => []),
        ])
        if (cancelled) return
        if (briefData?.brief) {
          setBrief(briefData.brief)
          setBriefTs(briefData.generated_at)
        }
        setPrefs(prefsData)
        setVoiceEnabled(prefsData?.voice_mode || false)
        if (statsData) setCipherStats(statsData)
        setPendingPositions(pendingData || [])
        // Show onboarding if not complete
        if (!prefsData?.onboarding_complete) {
          setOnboardingOpen(true)
        }
      } catch (err) {
        if (!cancelled) toast.error('Could not reach CIPHER — ' + (err.message || 'check backend'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [tier])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const generateBrief = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await api.generateAgentBrief()
      setBrief(res.brief)
      setBriefTs(res.generated_at)
      setCooldownEnd(Date.now() + 3600_000)
      toast.success('Brief generated.')
      if (voiceEnabled) speak(res.brief)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('rate limit') || msg.includes('429')) {
        toast.error(msg.replace('Brief rate limit: ', ''))
        setCooldownEnd(Date.now() + 3600_000)
      } else {
        toast.error('Generation failed — ' + msg)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleAsk = async (q = query) => {
    const question = (q || '').trim()
    if (!question || askLoading) return
    setQuery('')
    setAskLoading(true)
    setConversation(prev => [...prev, { role: 'user', content: question }])
    try {
      const res = await api.askAgent(question, sessionId, aggressionLevel)
      setConversation(prev => [...prev, { role: 'cipher', content: res.reply }])
      if (voiceEnabled) speak(res.reply)
    } catch (err) {
      setConversation(prev => [...prev, { role: 'cipher', content: `Uplink error: ${err.message}` }])
    } finally {
      setAskLoading(false)
    }
  }

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.error('Voice input not supported in this browser'); return }
    if (recRef.current) recRef.current.abort()
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      handleAsk(t)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  const stopListening = () => {
    recRef.current?.abort()
    setListening(false)
  }

  const readBriefAloud = () => {
    if (brief) speak(brief)
  }

  const onOnboardingComplete = async () => {
    try {
      const prefsData = await api.getAgentPreferences()
      setPrefs(prefsData)
      setVoiceEnabled(prefsData?.voice_mode || false)
    } catch (_) {}
  }

  const cooldownSeconds = cooldownEnd ? Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000)) : 0

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{
              width: '8px', height: '8px', background: '#CCFF00',
              boxShadow: '0 0 10px rgba(204,255,0,0.7)',
            }} className="animate-pulse" />
            <span style={{
              fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CCFF00', fontWeight: 700,
            }}>
              CIPHER · APEX AGENT · ONLINE
            </span>
            {cipherStats?.show_badge && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
                background: 'rgba(204,255,0,0.10)', color: '#CCFF00',
                border: '1px solid rgba(204,255,0,0.25)', padding: '2px 8px',
              }}>
                <TrendingUp size={9} />
                {cipherStats.win_rate}% WIN RATE
              </span>
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display, sans-serif)', fontSize: '28px',
            fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em',
          }}>
            Your Intelligence Agent
          </h1>
          <p style={{
            fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
            color: 'rgba(255,255,255,0.35)', marginTop: '6px', letterSpacing: '0.06em',
          }}>
            On-demand market briefs. Personalized signals. Voice interaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={() => { setVoiceEnabled(v => !v); if (voiceEnabled) stop() }}
            title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
            style={{
              padding: '8px 12px', border: voiceEnabled ? '1px solid rgba(204,255,0,0.30)' : '1px solid rgba(255,255,255,0.10)',
              background: voiceEnabled ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.03)',
              color: voiceEnabled ? '#CCFF00' : 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}>
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Setup */}
          <button
            onClick={() => setOnboardingOpen(true)}
            title="CIPHER setup"
            style={{
              padding: '8px 12px', border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}>
            <Settings size={14} />
          </button>

          {/* Aggression selector */}
          <div className="flex items-center" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
            title="CIPHER aggression level">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button
                key={lvl}
                onClick={() => setAggressionLevel(lvl)}
                style={{
                  padding: '7px 10px',
                  background: aggressionLevel === lvl ? `${AGG_COLORS[lvl]}18` : 'transparent',
                  color: aggressionLevel === lvl ? AGG_COLORS[lvl] : 'rgba(255,255,255,0.22)',
                  border: 'none', borderRight: lvl < 5 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontFamily: 'var(--font-data, monospace)', fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.10em', cursor: 'pointer',
                  transition: 'color 0.15s, background 0.15s',
                }}
                title={`L${lvl}: ${AGG_LABELS[lvl]}`}
              >
                L{lvl}
              </button>
            ))}
          </div>

          {/* Generate brief */}
          <button
            onClick={generateBrief}
            disabled={generating || cooldownSeconds > 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', cursor: generating || cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
              background: generating || cooldownSeconds > 0 ? 'rgba(204,255,0,0.05)' : 'rgba(204,255,0,0.12)',
              border: '1px solid rgba(204,255,0,0.25)', color: generating || cooldownSeconds > 0 ? 'rgba(204,255,0,0.35)' : '#CCFF00',
              fontFamily: 'var(--font-data, monospace)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
            {generating ? (
              <><RefreshCw size={12} className="animate-spin" /> Generating...</>
            ) : cooldownSeconds > 0 ? (
              <><Clock size={12} /> {Math.ceil(cooldownSeconds / 60)}m</>
            ) : (
              <><Zap size={12} /> Generate Brief</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          padding: '80px 0', textAlign: 'center',
          fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
          color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase',
        }} className="animate-pulse">
          CIPHER connecting...
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: brief ? '1fr 360px' : '1fr' }}>

          {/* Brief panel */}
          <div>
            {brief ? (
              <div style={{
                background: '#070A10', border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
              }}>
                {/* Brief header */}
                <div className="flex items-center justify-between px-6 py-4"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{
                      fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                      letterSpacing: '0.22em', textTransform: 'uppercase', color: '#CCFF00', fontWeight: 700,
                    }}>
                      CIPHER BRIEF
                    </span>
                    {briefTs && (
                      <span style={{
                        fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                        color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em',
                      }}>
                        {new Date(briefTs).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {voiceEnabled && (
                    <button
                      onClick={readBriefAloud}
                      title="Read brief aloud"
                      style={{
                        padding: '5px 10px', border: '1px solid rgba(204,255,0,0.20)',
                        background: 'rgba(204,255,0,0.06)', color: '#CCFF00',
                        fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                        letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                      }}>
                      <Volume2 size={11} />
                    </button>
                  )}
                </div>

                {/* Brief content */}
                <div className="px-6 py-5">
                  <BriefDisplay content={brief} />
                </div>
              </div>
            ) : (
              /* Empty state */
              <div style={{
                background: '#070A10', border: '1px solid rgba(255,255,255,0.06)',
                padding: '60px 40px', textAlign: 'center',
              }}>
                <div style={{
                  width: '48px', height: '48px', margin: '0 auto 20px',
                  border: '1px solid rgba(204,255,0,0.20)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={20} style={{ color: '#CCFF00' }} />
                </div>
                <p style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '11px',
                  color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', marginBottom: '8px',
                }}>
                  No brief yet.
                </p>
                <p style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                  color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em',
                }}>
                  Hit "Generate Brief" to have CIPHER analyze your watchlist.
                </p>
              </div>
            )}
          </div>

          {/* Chat panel — shown when brief exists */}
          {brief && (
            <div style={{
              background: '#070A10', border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', height: '520px',
            }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                  letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
                }}>
                  Ask CIPHER
                </span>
              </div>

              {/* Conversation */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
                {conversation.length === 0 && (
                  <div style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    color: 'rgba(255,255,255,0.22)', fontStyle: 'italic', textAlign: 'center',
                    paddingTop: '30px',
                  }}>
                    Ask me anything about your signals or the market.
                  </div>
                )}
                {conversation.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div style={{
                      maxWidth: '90%',
                      background: msg.role === 'user' ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                      border: msg.role === 'user' ? '1px solid rgba(204,255,0,0.18)' : '1px solid rgba(255,255,255,0.07)',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-data, monospace)', fontSize: '10px', lineHeight: 1.6,
                      color: msg.role === 'user' ? '#CCFF00' : 'rgba(255,255,255,0.75)',
                    }}>
                      {msg.role === 'cipher' ? (
                        msg.content.split('\n').map((l, j) => <BriefLine key={j} line={l} />)
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {askLoading && (
                  <div style={{ fontFamily: 'var(--font-data, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}
                    className="animate-pulse">
                    CIPHER thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Pending positions reminder */}
              {pendingPositions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
                  style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,184,0,0.03)' }}>
                  <span style={{
                    fontFamily: 'var(--font-data, monospace)', fontSize: '7px',
                    letterSpacing: '0.14em', color: 'rgba(255,184,0,0.50)',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    OPEN:
                  </span>
                  {pendingPositions.slice(0, 6).map(p => (
                    <span key={p.id} style={{
                      fontFamily: 'var(--font-data, monospace)', fontSize: '8px',
                      letterSpacing: '0.08em', color: '#FFB800',
                      background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.20)',
                      padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap', cursor: 'default',
                    }} title={p.instrument_description}>
                      {p.ticker} · {p.strategy_type}
                    </span>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-3 flex gap-2 items-end" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
                  placeholder="Ask about your signals..."
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.80)',
                    padding: '8px 11px', fontFamily: 'var(--font-data, monospace)', fontSize: '10px',
                    lineHeight: 1.5, outline: 'none',
                  }}
                />
                {/* Voice input */}
                <button
                  onClick={listening ? stopListening : startListening}
                  title={listening ? 'Stop listening' : 'Voice input'}
                  style={{
                    padding: '9px 10px', border: listening ? '1px solid rgba(204,255,0,0.30)' : '1px solid rgba(255,255,255,0.09)',
                    background: listening ? 'rgba(204,255,0,0.10)' : 'rgba(255,255,255,0.03)',
                    color: listening ? '#CCFF00' : 'rgba(255,255,255,0.35)', cursor: 'pointer', flexShrink: 0,
                  }}>
                  {listening ? <Mic size={13} className="animate-pulse" /> : <MicOff size={13} />}
                </button>
                <button
                  onClick={() => handleAsk()}
                  disabled={!query.trim() || askLoading}
                  style={{
                    padding: '9px 12px', cursor: !query.trim() || askLoading ? 'not-allowed' : 'pointer',
                    background: query.trim() ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.03)',
                    border: query.trim() ? '1px solid rgba(204,255,0,0.25)' : '1px solid rgba(255,255,255,0.07)',
                    color: query.trim() ? '#CCFF00' : 'rgba(255,255,255,0.20)', flexShrink: 0,
                  }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {onboardingOpen && (
          <ApexOnboarding
            open={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            onComplete={onOnboardingComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
