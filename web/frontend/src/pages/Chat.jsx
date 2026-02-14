import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import AITypingIndicator from '../components/AITypingIndicator'

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

  useEffect(() => {
    api.getChatHistory(sessionId).then((r) => setMessages(r.messages || [])).catch(() => setMessages([]))
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)
    try {
      const res = await api.chat(sessionId, trimmed)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply || '' }])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: ' + (e.message || 'Could not reach the assistant.') },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
          <MessageCircle size={28} className="text-apex-accent" />
          ADE Trading Assistant
        </h1>

        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/60 mb-6">Ask about trades, market data, or run ADE analysis.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => send(prompt)}
                    className="px-4 py-2.5 rounded-lg bg-white/10 text-white/90 hover:bg-apex-accent/20 hover:text-white text-sm border border-white/5 transition-colors"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-apex-accent/20 text-white border border-apex-accent/30'
                    : 'bg-white/10 text-white/90 border border-white/5'
                }`}
              >
                <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">
                  {m.role === 'user' ? 'You' : 'ADE Assistant'}
                </div>
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 bg-white/10 border border-white/5">
                <AITypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-6 flex gap-3">
          <motion.input
            whileFocus={{ borderColor: 'rgba(204,255,0,0.5)' }}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about a trade, market data, or run analysis..."
            className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:outline-none transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-apex-accent px-5 py-3 text-black font-display font-semibold hover:bg-apex-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Send size={18} />
            Send
          </motion.button>
        </div>
      </div>
    </PageWrapper>
  )
}
