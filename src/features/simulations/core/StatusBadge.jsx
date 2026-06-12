const VARIANTS = {
  success: 'bg-db-green/15  text-db-green  border-db-green/30',
  error:   'bg-db-red/15    text-db-red    border-db-red/30',
  warning: 'bg-db-amber/15  text-db-amber  border-db-amber/30',
  info:    'bg-db-blue/15   text-db-blue   border-db-blue/30',
  purple:  'bg-db-purple/15 text-db-purple border-db-purple/30',
  neutral: 'bg-db-surface   text-slate-400 border-db-border',
}

/**
 * Small colored badge for conveying status, phase, or category.
 * variant: 'success' | 'error' | 'warning' | 'info' | 'purple' | 'neutral'
 */
export default function StatusBadge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-mono ${VARIANTS[variant] ?? VARIANTS.neutral} ${className}`}>
      {children}
    </span>
  )
}
