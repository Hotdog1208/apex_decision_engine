import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import AnimatedNumber from './AnimatedNumber'
import { formatCurrency, formatPercent, formatNumber } from '../lib/format'

const easing = [0.16, 1, 0.3, 1]

export default function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  format = 'number',
  decimals = 2,
  icon: Icon,
  trend,
  sparklineData,
  variant = 'default',
  animate = true,
  delay = 0,
  className = '',
}) {
  const isProfit = variant === 'profit'
  const isLoss = variant === 'loss'
  const isAccent = variant === 'accent'

  const valueColorClass = isProfit
    ? 'text-apex-profit drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]'
    : isLoss
      ? 'text-apex-loss drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]'
      : isAccent
        ? 'text-apex-accent drop-shadow-[0_0_10px_rgba(204,255,0,0.5)]'
        : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'

  const borderColorClass = isProfit
    ? 'border-l-apex-profit'
    : isLoss
      ? 'border-l-apex-loss'
      : isAccent
        ? 'border-l-apex-accent'
        : 'border-l-white/20'

  const content = (
    <div className="relative z-10">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-white/50 text-[10px] font-data uppercase tracking-[0.2em]">
          {Icon && <Icon size={14} className="shrink-0 text-white/80" />}
          <span className="border-b border-white/20 pb-0.5">{label}</span>
        </div>
        {trend != null && (
          <span className={`text-[10px] font-data font-bold px-2 py-0.5 ${trend >= 0 ? 'bg-apex-profit/20 text-apex-profit' : 'bg-apex-loss/20 text-apex-loss'}`}>
            {trend >= 0 ? '+' : ''}{formatPercent(trend, { decimals: 1, signed: true })}
          </span>
        )}
      </div>

      <div className={`font-display font-black text-4xl tracking-tighter ${valueColorClass}`}>
        {format === 'currency' && (
          <AnimatedNumber value={value} prefix={prefix || '$'} suffix={suffix} format="currency" decimals={decimals} />
        )}
        {format === 'percent' && (
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix || '%'} format="number" decimals={decimals} />
        )}
        {format === 'number' && (
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} format="number" decimals={decimals} />
        )}
      </div>

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-6 h-12 -mb-2 border-t border-white/5 pt-2 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="stepAfter"
                dataKey="value"
                stroke={isLoss ? '#FF0055' : isAccent ? '#CCFF00' : isProfit ? '#00FF88' : '#00F0FF'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HUD Accents */}
      <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M0 0H20V20" stroke="currentColor" strokeWidth="1" />
          <path d="M15 5L20 0" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 p-2 text-[6px] font-data text-white/20 uppercase">
        {label.substring(0, 3)} // OK
      </div>
    </div>
  )

  const cardClass = `relative cyber-panel p-6 border-l-[4px] bg-black/60 overflow-hidden group hover:bg-black/80 ${borderColorClass} ${className}`

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: easing }}
        whileHover={{ scale: 1.02 }}
        className={cardClass}
      >
        <div className="absolute inset-0 scanlines opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity" />
        {content}
      </motion.div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="absolute inset-0 scanlines opacity-20 group-hover:opacity-40 pointer-events-none transition-opacity" />
      {content}
    </div>
  )
}
