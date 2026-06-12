export default function CodePanel({ code = [], highlightLine = -1, annotations = {} }) {
  return (
    <div className="bg-[#020617] border border-db-border rounded-xl overflow-hidden font-mono text-xs">
      <div className="px-4 py-2 border-b border-db-border text-db-muted text-[10px] uppercase tracking-widest">
        Pseudocode
      </div>
      <div className="p-3 space-y-0.5 overflow-y-auto max-h-96">
        {code.map((line, i) => (
          <div
            key={i}
            className={`flex gap-3 px-2 py-0.5 rounded transition-colors duration-200 ${
              i === highlightLine ? 'bg-db-blue/15 border-l-2 border-db-blue' : 'border-l-2 border-transparent'
            }`}
          >
            <span className="text-db-border w-5 text-right shrink-0 select-none">{i + 1}</span>
            <span className={i === highlightLine ? 'text-white' : 'text-slate-400'} style={{ whiteSpace: 'pre' }}>{line}</span>
            {annotations[i] && (
              <span className="text-db-muted ml-auto text-[10px] italic shrink-0">{annotations[i]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
