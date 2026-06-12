import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import CodePanel from '../../components/shared/CodePanel'
import { usePlayer } from '../../hooks/usePlayer'
import { joinSteps, DEFAULT_OUTER, DEFAULT_INNER, NL_CODE, HJ_CODE, MJ_CODE } from '../../simulation/joins'

const HELP = {
  title: 'Join Algorithms',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Nested Loop', text: 'For every outer row, scan all inner rows. O(n x m) comparisons — simple but slow.' },
        { label: 'Hash Join', text: 'Build a hash table on the inner table, then probe it for each outer row. O(n + m).' },
        { label: 'Merge Join', text: 'Sort both tables first, then scan them together with two pointers. O(n + m) after sort.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Press Play', text: 'All three algorithms advance in lockstep so you can compare them side by side.' },
        { label: 'Step arrows', text: 'Use the back/forward arrows to move one step at a time.' },
        { label: 'Code tab', text: 'Switch the code panel between NL, HJ, and MJ to see the relevant pseudocode.' },
      ],
    },
    {
      heading: 'Reading the columns',
      items: [
        { label: 'Match / Miss', text: 'Green = join key matched; gray = no match on this comparison.' },
        { label: 'Hash table', text: 'The Hash Join column shows the build phase table as entries are added.' },
        { label: 'Pointers', text: 'Merge Join highlights the current i and j pointer positions in each sorted array.' },
      ],
    },
  ],
}

const ALGOS = [
  { key: 'nl',  label: 'Nested Loop', color: 'text-db-blue',   border: 'border-db-blue/40',   bg: 'bg-db-blue/5',   code: NL_CODE },
  { key: 'hj',  label: 'Hash Join',   color: 'text-db-purple', border: 'border-db-purple/40', bg: 'bg-db-purple/5', code: HJ_CODE },
  { key: 'mj',  label: 'Merge Join',  color: 'text-db-green',  border: 'border-db-green/40',  bg: 'bg-db-green/5',  code: MJ_CODE },
]

function RowBadge({ row, highlight, type = 'outer' }) {
  if (!row) return null
  const isOuter = type === 'outer'
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: highlight ? 1.05 : 1 }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border
        ${highlight
          ? isOuter ? 'bg-db-blue/20 border-db-blue text-db-blue' : 'bg-db-green/20 border-db-green text-db-green'
          : 'bg-db-surface border-db-border text-slate-400'
        }`}
    >
      {isOuter ? `id=${row.id} ${row.name}` : `uid=${row.userId} ${row.order}`}
    </motion.span>
  )
}

function AlgoColumn({ algoMeta, steps, cursor }) {
  const step = steps[cursor] ?? null
  const matches = step?.results?.length ?? 0
  const comparisons = step?.comparisons ?? 0

  return (
    <div className={`rounded-xl border ${algoMeta.border} ${algoMeta.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className={`font-bold text-sm ${algoMeta.color}`}>{algoMeta.label}</span>
        <div className="flex gap-3 text-xs font-mono">
          <span className="text-db-green">{matches} matches</span>
          <span className="text-db-muted">{comparisons} ops</span>
        </div>
      </div>

      {/* Phase badge */}
      <AnimatePresence mode="wait">
        {step && (
          <motion.div
            key={`${cursor}-${algoMeta.key}`}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg text-center border
              ${step.phase === 'match' ? 'bg-db-green/10 text-db-green border-db-green/30'
              : step.phase === 'miss' || step.phase === 'compare' ? 'bg-db-surface text-slate-400 border-db-border'
              : step.phase === 'done' ? 'bg-db-blue/10 text-db-blue border-db-blue/30'
              : `border-db-border ${algoMeta.color} bg-db-surface/60`}`}
          >
            {step.phase === 'match' ? '✓ Match found' : step.phase === 'done' ? '✓ Complete' : step.phase?.replace('-', ' ')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active rows */}
      {step && (
        <div className="space-y-1.5">
          {step.outerRow && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-db-muted w-12">Outer:</span>
              <RowBadge row={step.outerRow} highlight type="outer" />
            </div>
          )}
          {step.innerRow && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-db-muted w-12">Inner:</span>
              <RowBadge row={step.innerRow} highlight type="inner" />
            </div>
          )}
          {algoMeta.key === 'hj' && step.hashTable && Object.keys(step.hashTable).length > 0 && (
            <div className="text-xs space-y-0.5">
              <div className="text-db-muted">Hash table:</div>
              {Object.entries(step.hashTable).map(([k, v]) => (
                <div key={k} className="font-mono text-slate-400 pl-2">
                  [{k}] → {v.map(r => r.order).join(', ')}
                </div>
              ))}
            </div>
          )}
          {algoMeta.key === 'mj' && step.sortedOuter && (
            <div className="text-xs space-y-1">
              <div className="flex gap-1 flex-wrap">
                {step.sortedOuter.map((r, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded font-mono text-[10px] border
                    ${i === step.i ? 'bg-db-blue/20 border-db-blue text-db-blue' : 'border-db-border text-slate-500'}`}>
                    {r.id}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {step.sortedInner.map((r, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded font-mono text-[10px] border
                    ${i === step.j ? 'bg-db-green/20 border-db-green text-db-green' : 'border-db-border text-slate-500'}`}>
                    {r.userId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results so far */}
      {step?.results?.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-db-muted font-mono uppercase tracking-widest">Output</div>
          {step.results.map((r, i) => (
            <div key={i} className={`text-xs font-mono ${algoMeta.color} bg-db-card rounded px-2 py-0.5`}>
              {r.outer.name} + {r.inner.order}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JoinAlgorithms() {
  const [cursor, setCursor] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [intervalId, setIntervalId] = useState(null)
  const [activeCode, setActiveCode] = useState('nl')

  const { nlSteps, hjSteps, mjSteps } = useMemo(
    () => joinSteps(DEFAULT_OUTER, DEFAULT_INNER), []
  )
  const maxStep = nlSteps.length - 1

  function handlePlay() {
    if (cursor >= maxStep) { setCursor(0); return }
    setPlaying(true)
    const id = setInterval(() => {
      setCursor(prev => {
        if (prev >= maxStep) { clearInterval(id); setPlaying(false); return prev }
        return prev + 1
      })
    }, 900 / speed)
    setIntervalId(id)
  }

  function handlePause() { clearInterval(intervalId); setPlaying(false) }
  function handleReset() { clearInterval(intervalId); setPlaying(false); setCursor(-1) }

  const codeMap = { nl: NL_CODE, hj: HJ_CODE, mj: MJ_CODE }
  const highlightLine = cursor >= 0 ? (nlSteps[cursor]?.highlightLine ?? -1) : -1

  return (
    <SimLayout
      title="Join Algorithms"
      subtitle="Side-by-side: Nested Loop · Hash Join · Merge Join"
      accentColor="blue"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          {/* Tables */}
          <div className="space-y-3">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Outer Table (Users)</div>
            <div className="space-y-1">
              {DEFAULT_OUTER.map(r => (
                <div key={r.id} className="text-xs font-mono px-3 py-1.5 bg-db-bg border border-db-border rounded-lg flex justify-between text-slate-400">
                  <span className="text-db-blue">id={r.id}</span>
                  <span>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Inner Table (Orders)</div>
            <div className="space-y-1">
              {DEFAULT_INNER.map((r, i) => (
                <div key={i} className="text-xs font-mono px-3 py-1.5 bg-db-bg border border-db-border rounded-lg flex justify-between text-slate-400">
                  <span className="text-db-green">uid={r.userId}</span>
                  <span>{r.order}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost summary */}
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Cost Complexity</div>
            {[
              { label: 'Nested Loop', cost: 'O(n × m)', color: 'text-db-red' },
              { label: 'Hash Join',   cost: 'O(n + m)', color: 'text-db-green' },
              { label: 'Merge Join',  cost: 'O(n + m)*', color: 'text-db-amber' },
            ].map(c => (
              <div key={c.label} className="flex justify-between text-xs">
                <span className="text-slate-400">{c.label}</span>
                <span className={`font-mono ${c.color}`}>{c.cost}</span>
              </div>
            ))}
            <p className="text-[10px] text-db-muted">*after sort O(n log n + m log m)</p>
          </div>
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Three-column comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ALGOS.map(algo => (
              <AlgoColumn
                key={algo.key}
                algoMeta={algo}
                steps={algo.key === 'nl' ? nlSteps : algo.key === 'hj' ? hjSteps : mjSteps}
                cursor={cursor}
              />
            ))}
          </div>

          {cursor < 0 && (
            <div className="text-center py-10 text-db-muted text-sm">
              Press Play to start the side-by-side comparison
            </div>
          )}

          {/* Explanation */}
          {cursor >= 0 && (
            <motion.div
              key={cursor}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-db-card border border-db-border rounded-xl p-5"
            >
              <p className="text-sm text-white">{nlSteps[cursor]?.explanation}</p>
            </motion.div>
          )}
        </div>
      }
      timeline={
        <div className="bg-db-surface border border-db-border rounded-xl p-4 space-y-3">
          <div className="h-1 bg-db-border rounded-full overflow-hidden">
            <div className="h-full bg-db-blue transition-all" style={{ width: `${maxStep > 0 ? ((cursor + 1) / (maxStep + 1)) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="p-1.5 rounded-lg text-db-muted hover:text-white hover:bg-white/5 transition-colors">⟳</button>
            <button onClick={() => setCursor(c => Math.max(c - 1, -1))} disabled={cursor < 0} className="p-1.5 rounded-lg text-db-muted hover:text-white disabled:opacity-30 transition-colors">←</button>
            {playing
              ? <button onClick={handlePause} className="px-4 py-1.5 bg-db-blue text-white rounded-lg text-sm font-medium">⏸ Pause</button>
              : <button onClick={handlePlay} disabled={cursor >= maxStep} className="px-4 py-1.5 bg-db-blue disabled:opacity-30 text-white rounded-lg text-sm font-medium">▶ Play</button>
            }
            <button onClick={() => setCursor(c => Math.min(c + 1, maxStep))} disabled={cursor >= maxStep} className="p-1.5 rounded-lg text-db-muted hover:text-white disabled:opacity-30 transition-colors">→</button>
            <span className="text-xs text-db-muted font-mono ml-auto">
              {cursor >= 0 ? `Step ${cursor + 1} / ${nlSteps.length}` : 'not started'}
            </span>
            <div className="flex gap-1">
              {[0.5, 1, 2].map(s => (
                <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-0.5 rounded text-xs font-mono ${speed === s ? 'bg-db-blue text-white' : 'text-db-muted'}`}>{s}×</button>
              ))}
            </div>
          </div>
        </div>
      }
      rightPanel={
        <div className="space-y-3">
          <div className="flex gap-1">
            {ALGOS.map(a => (
              <button key={a.key} onClick={() => setActiveCode(a.key)}
                className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${activeCode === a.key ? `${a.color} bg-db-bg` : 'text-db-muted'}`}>
                {a.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <CodePanel code={codeMap[activeCode]} highlightLine={activeCode === 'nl' ? highlightLine : -1} />
        </div>
      }
    />
  )
}
