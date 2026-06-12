const SPEEDS = [0.5, 1, 2, 4]

export default function Controls({ playing, onPlay, onPause, onForward, onBack, onReset, current, max, speed, onSpeedChange }) {
  const pct = max > 0 ? (current / max) * 100 : 0

  return (
    <div className="bg-db-surface border border-db-border rounded-xl p-4 space-y-3">
      <div className="h-1 bg-db-border rounded-full overflow-hidden">
        <div className="h-full bg-db-blue transition-all duration-300 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onReset} className="p-1.5 rounded-lg text-db-muted hover:text-white hover:bg-white/5 transition-colors" title="Reset">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button onClick={onBack} disabled={current <= 0} className="p-1.5 rounded-lg text-db-muted hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {playing ? (
          <button onClick={onPause} className="px-4 py-1.5 bg-db-blue hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
            <span>⏸</span> Pause
          </button>
        ) : (
          <button onClick={onPlay} disabled={current >= max} className="px-4 py-1.5 bg-db-blue hover:bg-blue-400 disabled:opacity-30 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
            <span>▶</span> Play
          </button>
        )}
        <button onClick={onForward} disabled={current >= max} className="p-1.5 rounded-lg text-db-muted hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-xs text-db-muted font-mono ml-1">Step {current + 1} / {max + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          {SPEEDS.map(s => (
            <button key={s} onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${speed === s ? 'bg-db-blue text-white' : 'text-db-muted hover:text-white'}`}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
