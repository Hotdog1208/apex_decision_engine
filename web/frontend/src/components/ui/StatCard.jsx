export default function StatCard({ label, value, icon: Icon, color = 'rgba(255,255,255,0.90)', subLabel, className = '' }) {
  return (
    <div
      className={`p-5 ${className}`}
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex justify-between items-start mb-3">
        <span style={{
          fontFamily: 'var(--font-data, monospace)',
          fontSize: '9px', letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
        }}>
          {label}
        </span>
        {Icon && <Icon size={13} style={{ color, opacity: 0.8 }} />}
      </div>

      <p style={{
        fontFamily: 'var(--font-display, sans-serif)',
        fontSize: '22px', fontWeight: 900, color,
        lineHeight: 1.1,
      }}>
        {value}
      </p>

      {subLabel && (
        <p style={{
          fontFamily: 'var(--font-data, monospace)',
          fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginTop: '4px',
        }}>
          {subLabel}
        </p>
      )}
    </div>
  )
}
