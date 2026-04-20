import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, Cpu, Zap, Radio, Terminal } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import AITypingIndicator from '../components/AITypingIndicator'
import GlitchText from '../components/GlitchText'
import MagneticButton from '../components/MagneticButton'

const SUGGESTED_PROMPTS = [
  "What's moving the market today?",
  "Analyze my trade idea: AAPL $180 call, 2 weeks out",
  "Show me high-confidence setups from ADE",
  "Explain IV Rank vs IV Percentile",
  "Run ADE analysis and summarize top ideas",
]

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).slice(2, 9))
  const bottomRef = useRef(null)
  const location = useLocation()
  const initialData = location.state

  useEffect(() => {
    api.getChatHistory(sessionId).then((r) => setMessages(r.messages || [])).catch(() => setMessages([]))
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (initialData?.symbol && messages.length === 0 && !loading) {
        send(`Explain the current signal for ${initialData.symbol} and suggest a trade structure.`, initialData.signal)
    }
  }, [initialData])

  const send = async (text, signalCtx = null) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)
    try {
      const res = await api.chat(sessionId, trimmed, signalCtx)
      const reply = res?.reply ?? res?.content ?? ''
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || 'No response.' }])
    } catch (e) {
      const errMsg = e.message || 'Could not reach the assistant.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `**CRITICAL ERROR:** ${errMsg}\n\nREESTABLISH UPLINK: \`run-backend.ps1\` or \`python -m uvicorn web.backend.app:app --port 8000\`` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper className="min-h-screen pb-0">
      <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto relative pt-4">

        {/* Terminal Header */}
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-end justify-between border-b-[2px] border-white/20 pb-4 relative">
          <div className="absolute top-0 right-0 grid grid-cols-2 gap-1 pointer-events-none opacity-30 hidden md:grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-apex-pink animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 text-apex-pink">
              <Terminal size={14} className="animate-pulse" />
              <span className="font-data text-[10px] uppercase tracking-[0.4em] font-bold">Secure Command Uplink // V_2.0</span>
            </div>
            <GlitchText as="h1" text="ADE.CORE_LINK" className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter" />
          </div>
          <div className="mt-4 md:mt-0 px-3 py-1 bg-apex-pink/10 border border-apex-pink text-apex-pink font-data text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
            <Radio size={12} className="animate-spin-slow" />
            <span className="animate-pulse">Connection ESTABLISHED</span>
          </div>
        </div>

        {/* Console Output Area */}
        <div className="flex-1 overflow-y-auto cyber-panel bg-black/80 border-t-2 border-x-2 border-white/20 relative shadow-[inset_0_20px_50px_rgba(0,0,0,0.8)] custom-scrollbar">
          {/* Internal grid overlay */}
          <div className="absolute inset-x-0 top-0 h-full pointer-events-none opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

          <div className="p-6 md:p-10 space-y-8 relative z-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
                <Cpu size={64} className="text-white/10 mb-6" />
                <h3 className="text-apex-pink font-data text-sm uppercase tracking-[0.4em] font-bold mb-4 animate-pulse">Waiting for manual input</h3>
                <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => send(prompt)}
                      className="px-4 py-3 border border-white/20 bg-white/5 font-data text-xs text-white/70 hover:text-black hover:bg-apex-pink hover:border-apex-pink transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(255,0,85,0.4)]"
                    >
                      &gt;_ {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, x: isUser ? 20 : -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        {isUser ? (
                          <>
                            <span className="text-[10px] font-data font-bold text-white/50 tracking-widest uppercase">Operator</span>
                            <div className="w-6 h-6 rounded-full bg-apex-cyan/20 border border-apex-cyan flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-apex-cyan animate-pulse" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-none bg-apex-pink/20 border border-apex-pink flex items-center justify-center shadow-[0_0_10px_rgba(255,0,85,0.4)]">
                              <Cpu size={12} className="text-apex-pink" />
                            </div>
                            <span className="text-[10px] font-data font-bold text-apex-pink tracking-widest uppercase">ADE.CORE</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`relative p-5 text-sm md:text-base leading-relaxed ${isUser
                          ? 'bg-zinc-900 border border-apex-cyan/50 text-white rounded-l-xl rounded-br-xl'
                          : 'bg-black/60 border border-apex-pink/50 text-white/90 rounded-r-xl rounded-bl-xl font-mono'
                          } shadow-2xl`}
                        style={{ boxShadow: isUser ? '-10px 10px 30px rgba(0,240,255,0.05)' : '10px 10px 30px rgba(255,0,85,0.05)' }}
                      >
                        {/* Decorative corner cut on the message bubbles based on user */}
                        {isUser && <div className="absolute top-0 right-0 w-3 h-3 bg-black transform translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-b border-apex-cyan/50" />}
                        {!isUser && <div className="absolute top-0 left-0 w-3 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-apex-pink/50" />}

                        <div className="whitespace-pre-wrap break-words">
                          {isUser ? m.content : <ReactMarkdown className="prose prose-invert max-w-none prose-sm">{m.content}</ReactMarkdown>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[75%] items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-none bg-apex-pink/20 border border-apex-pink flex items-center justify-center shadow-[0_0_10px_rgba(255,0,85,0.4)]">
                      <Cpu size={12} className="text-apex-pink" />
                    </div>
                    <span className="text-[10px] font-data font-bold text-apex-pink tracking-widest uppercase">ADE.CORE</span>
                  </div>
                  <div className="relative p-5 text-sm md:text-base leading-relaxed bg-black/60 border border-apex-pink/50 text-white/90 rounded-r-xl rounded-bl-xl font-mono shadow-2xl"
                    style={{ boxShadow: '10px 10px 30px rgba(255,0,85,0.05)' }}>
                    <div className="absolute top-0 left-0 w-3 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-apex-pink/50" />
                    <AITypingIndicator />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Console */}
        <div className="bg-black/90 p-4 border border-white/20 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] relative z-20">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-apex-cyan to-transparent opacity-50" />

          <div className="flex gap-4">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-apex-cyan opacity-0 group-focus-within:opacity-[0.05] transition-opacity pointer-events-none" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-apex-cyan font-data font-bold animate-pulse">&gt;</div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="EXECUTE QUERY..."
                className="w-full bg-transparent border-b-2 border-white/20 focus:border-apex-cyan px-10 py-4 text-white font-data text-lg placeholder-white/20 focus:outline-none transition-colors"
              />
            </div>

            <MagneticButton
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="!px-8 !py-4 shrink-0 bg-apex-cyan text-black hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <span className="font-data uppercase font-black tracking-widest text-sm">TRANSMIT</span>
                {loading ? <Zap size={18} className="animate-pulse text-black" /> : <Send size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform text-black" />}
              </div>
            </MagneticButton>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
