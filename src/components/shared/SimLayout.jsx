export default function SimLayout({ title, subtitle, accentColor = 'blue', left, center, timeline, rightPanel, help }) {
  const accentMap = {
    blue:   'text-db-blue   border-db-blue',
    purple: 'text-db-purple border-db-purple',
    green:  'text-db-green  border-db-green',
    amber:  'text-db-amber  border-db-amber',
    red:    'text-db-red    border-db-red',
  }
  const accent = accentMap[accentColor] ?? accentMap.blue

  return (
    <div className="min-h-screen bg-db-bg flex flex-col">
      {/* Top toolbar */}
      <div className="border-b border-db-border bg-db-surface px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold text-white`}>{title}</h1>
          {subtitle && <p className="text-db-muted text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`h-1 w-16 rounded-full ${accent.split(' ')[0].replace('text-', 'bg-')}`} />
          {help}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {left && (
          <aside className="w-72 shrink-0 border-r border-db-border bg-db-surface overflow-y-auto p-5 space-y-6">
            {left}
          </aside>
        )}

        {/* Center canvas */}
        <main className="flex-1 overflow-auto p-6 space-y-4">
          {center}

          {/* Keep supporting code and details below the visualization so the
              main canvas retains the full available width. */}
          {rightPanel && <div>{rightPanel}</div>}

          {/* Timeline controls */}
          {timeline && <div>{timeline}</div>}
        </main>
      </div>
    </div>
  )
}
