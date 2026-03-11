/**
 * Consistent page title + subtitle + optional actions.
 * Use at top of every main page for clear hierarchy.
 */
export default function PageHeader({ title, subtitle, icon: Icon, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 mb-8 ${className}`}>
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
          {Icon && <span className="text-apex-accent">{<Icon size={32} />}</span>}
          {title}
        </h1>
        {subtitle && <p className="text-white/50 text-sm mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}
