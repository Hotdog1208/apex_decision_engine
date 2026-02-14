import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'

export default function TradeTable({ trades, onApprove, onClose }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-left text-xs uppercase tracking-wider">
            <th className="py-3 px-3">Symbol</th>
            <th className="py-3 px-3">Strategy</th>
            <th className="py-3 px-3">Direction</th>
            <th className="py-3 px-3">Entry</th>
            <th className="py-3 px-3">Quantity</th>
            <th className="py-3 px-3">Capital</th>
            <th className="py-3 px-3">Confidence</th>
            <th className="py-3 px-3">State</th>
            <th className="py-3 px-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades?.map((t) => (
            <Fragment key={t.trade_id}>
              <motion.tr
                key={t.trade_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                onClick={() => setExpanded(expanded === t.trade_id ? null : t.trade_id)}
                className="border-b border-white/5 cursor-pointer group"
              >
                <td className="py-3 px-3 font-data text-white font-medium">{t.symbol}</td>
                <td className="py-3 px-3 text-white/80">{t.strategy}</td>
                <td className="py-3 px-3">
                  <span className={t.direction === 'long' ? 'text-apex-profit' : 'text-apex-loss'}>
                    {t.direction === 'long' ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />}
                    {' '}{t.direction}
                  </span>
                </td>
                <td className="py-3 px-3 font-data text-white/80">
                  ${t.position_details?.entry_price?.toFixed(2) ?? '-'}
                </td>
                <td className="py-3 px-3 font-data text-white/80">
                  {t.position_details?.quantity ?? t.position_details?.shares ?? t.position_details?.contracts ?? '-'}
                </td>
                <td className="py-3 px-3 font-data text-white/80">
                  ${(t.capital_allocated ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${(t.confidence_score ?? 0) >= 70 ? 'bg-apex-profit' : 'bg-white/50'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, t.confidence_score ?? 0)}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className={`font-data text-xs ${(t.confidence_score ?? 0) >= 70 ? 'text-apex-profit' : 'text-white/60'}`}>
                      {(t.confidence_score ?? 0).toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    t.lifecycle_state === 'active' ? 'bg-apex-profit/20 text-apex-profit' :
                    t.lifecycle_state === 'pending' ? 'bg-apex-warning/20 text-apex-warning' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {t.lifecycle_state ?? 'pending'}
                  </span>
                </td>
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  {t.lifecycle_state === 'pending' && onApprove && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onApprove(t.trade_id)}
                      className="p-1.5 rounded bg-apex-profit/20 text-apex-profit hover:bg-apex-profit/30 transition-colors"
                      title="Approve"
                    >
                      <Check size={16} />
                    </motion.button>
                  )}
                  {(t.lifecycle_state === 'active' || t.lifecycle_state === 'pending') && onClose && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onClose(t.trade_id)}
                      className="p-1.5 rounded bg-apex-loss/20 text-apex-loss hover:bg-apex-loss/30 ml-1 inline-block"
                      title="Close"
                    >
                      <X size={16} />
                    </motion.button>
                  )}
                </td>
              </motion.tr>
              <AnimatePresence>
                {expanded === t.trade_id && (
                  <motion.tr
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-white/5"
                  >
                    <td colSpan={9} className="px-3 py-4 bg-white/5">
                      <div className="text-xs text-white/60 space-y-1">
                        <p><span className="text-white/40">Trade ID:</span> {t.trade_id}</p>
                        {t.position_details && (
                          <p><span className="text-white/40">Entry:</span> ${t.position_details.entry_price?.toFixed(2)} • Qty: {t.position_details.quantity ?? t.position_details.shares ?? t.position_details.contracts}</p>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </Fragment>
          ))}
        </tbody>
      </table>
      {(!trades || trades.length === 0) && (
        <p className="text-white/40 py-12 text-center font-data text-sm">No trades. Run the engine to generate ideas.</p>
      )}
    </div>
  )
}
