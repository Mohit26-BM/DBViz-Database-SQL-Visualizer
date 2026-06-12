import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../../components/shared/SimLayout'
import SimHelp from '../../../components/shared/SimHelp'
import AIExplainer from '../../../components/shared/AIExplainer'
import CodePanel from '../../../components/shared/CodePanel'
import DataTable from '../core/DataTable'
import StatusBadge from '../core/StatusBadge'
import { joinSteps, DEFAULT_OUTER, DEFAULT_INNER, NL_CODE, HJ_CODE, MJ_CODE } from './engine'

/**
 * JoinAlgorithms is a special-case simulator: three algorithms advance in
 * lockstep from a single cursor so comparisons are synchronised.
 * This cannot use SimulationPlayer (which owns one step array); instead it
 * manages its own cursor + setInterval, then wraps SimLayout directly.
 */

const HELP = {
  title: 'Join Algorithms',
  sections: [
    {
      heading: 'Three algorithms',
      items: [
        { label: 'Nested Loop', text: 'For each outer row, scan all inner rows. O(n x m) — simple but slow.' },
        { label: 'Hash Join', text: 'Build a hash table on the inner table, then probe. O(n + m).' },
        { label: 'Merge Join', text: 'Sort both tables, then scan with two pointers. O(n + m) after sort.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Press Play', text: 'All three algorithms advance together so you can compare them side by side.' },
        { label: 'Pseudocode', text: 'Switch tabs below the visualization to see each algorithm\'s pseudocode.' },
        { label: 'Final results', text: 'When the simulation finishes, a comparison panel shows all matches side by side.' },
      ],
    },
  ],
}

const ALGOS = [
  { key: 'nl', label: 'Nested Loop', color: 'text-db-blue',   border: 'border-db-blue/40',   bg: 'bg-db-blue/5',   code: NL_CODE },
  { key: 'hj', label: 'Hash Join',   color: 'text-db-purple', border: 'border-db-purple/40', bg: 'bg-db-purple/5', code: HJ_CODE },
  { key: 'mj', label: 'Merge Join',  color: 'text-db-green',  border: 'border-db-green/40',  bg: 'bg-db-green/5',  code: MJ_CODE },
]

function stepIndexAtProgress(steps, cursor, maxStep) {
  if (cursor < 0 || maxStep <= 0) return cursor
  return Math.min(Math.round((cursor / maxStep) * (steps.length - 1)), steps.length - 1)
}

function AlgoColumn({ algoMeta, steps, cursor, maxStep }) {
  const stepIndex = stepIndexAtProgress(steps, cursor, maxStep)
  const step = steps[stepIndex] ?? null
  const matches     = step?.results?.length ?? 0
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

      <AnimatePresence mode="wait">
        {step && (
          <motion.div key={`${stepIndex}-${algoMeta.key}`}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg text-center border
              ${step.phase === 'match' ? 'bg-db-green/10 text-db-green border-db-green/30'
              : step.phase === 'done'  ? 'bg-db-blue/10  text-db-blue  border-db-blue/30'
              : 'border-db-border text-slate-400'}`}>
            {step.phase === 'match' ? 'Match found' : step.phase === 'done' ? 'Complete' : step.phase?.replace('-', ' ')}
          </motion.div>
        )}
      </AnimatePresence>

      {step && (
        <div className="space-y-1.5">
          {step.outerRow && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-db-muted w-12">Outer:</span>
              <span className="px-2 py-0.5 rounded font-mono border text-xs bg-db-blue/10 border-db-blue text-db-blue">
                id={step.outerRow.id} {step.outerRow.name}
              </span>
            </div>
          )}
          {step.innerRow && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-db-muted w-12">Inner:</span>
              <span className="px-2 py-0.5 rounded font-mono border text-xs bg-db-green/10 border-db-green text-db-green">
                uid={step.innerRow.userId}
              </span>
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
            <div className="space-y-1">
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

      {/* Partial results during simulation */}
      {step?.results?.length > 0 && step.phase !== 'done' && (
        <div className="space-y-1">
          <div className="text-[10px] text-db-muted font-mono uppercase tracking-widest">Output so far</div>
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

function FinalComparison({ nlSteps, hjSteps, mjSteps }) {
  const finals = ALGOS.map(algo => {
    const steps = algo.key === 'nl' ? nlSteps : algo.key === 'hj' ? hjSteps : mjSteps
    return { ...algo, final: steps[steps.length - 1] }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-db-card border border-db-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-db-border flex items-center justify-between">
        <span className="text-sm font-bold text-white">Final Results</span>
        <span className="text-xs text-db-muted">All three algorithms produce identical matches</span>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {finals.map(({ key, label, color, border, bg, final }) => (
          <div key={key} className={`rounded-xl border ${border} ${bg} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-sm ${color}`}>{label}</span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-db-green font-mono">{final?.results?.length ?? 0} matches</span>
                {final?.comparisons != null && (
                  <span className="text-[10px] text-db-muted font-mono">{final.comparisons} ops</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {(final?.results ?? []).map((r, i) => (
                <div key={i} className={`text-xs font-mono ${color} bg-db-bg rounded px-2 py-1`}>
                  {r.outer.name} + {r.inner.order}
                  <span className="text-db-muted ml-2">${r.inner.amount}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 pb-4 text-xs text-db-muted">
        Strategy differs — Nested Loop: O(n×m) comparisons · Hash Join: O(n+m) after build phase · Merge Join: O(n+m) after O(n log n + m log m) sort
      </div>
    </motion.div>
  )
}

export default function JoinAlgorithmsPage() {
  const [cursor, setCursor]       = useState(-1)
  const [playing, setPlaying]     = useState(false)
  const [speed, setSpeed]         = useState(1)
  const [activeCode, setActiveCode] = useState('nl')

  const { nlSteps, hjSteps, mjSteps } = useMemo(() => joinSteps(DEFAULT_OUTER, DEFAULT_INNER), [])
  const maxStep = Math.max(nlSteps.length, hjSteps.length, mjSteps.length) - 1

  useEffect(() => {
    if (!playing) return undefined

    const intervalId = setInterval(() => {
      setCursor(prev => {
        if (prev >= maxStep - 1) {
          setPlaying(false)
          return maxStep
        }
        return prev + 1
      })
    }, 900 / speed)

    return () => clearInterval(intervalId)
  }, [playing, speed, maxStep])

  function stop() {
    setPlaying(false)
  }

  function handlePlay() {
    if (cursor >= maxStep) setCursor(0)
    setPlaying(true)
  }

  const isDone = cursor >= maxStep
  const currentSteps = {
    nl: nlSteps[stepIndexAtProgress(nlSteps, cursor, maxStep)],
    hj: hjSteps[stepIndexAtProgress(hjSteps, cursor, maxStep)],
    mj: mjSteps[stepIndexAtProgress(mjSteps, cursor, maxStep)],
  }
  const combinedExplanation = ALGOS
    .map(algo => `${algo.label}: ${currentSteps[algo.key]?.explanation ?? 'Not started.'}`)
    .join('\n')

  return (
    <SimLayout
      title="Join Algorithms"
      subtitle="Side-by-side: Nested Loop · Hash Join · Merge Join"
      accentColor="blue"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}

      left={
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Outer Table (Users)</div>
            <DataTable
              columns={['id', 'name']}
              rows={DEFAULT_OUTER.map(r => [r.id, r.name])}
              pkColumns={['id']}
              accentColor="blue"
            />
          </div>
          <div className="space-y-3">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Inner Table (Orders)</div>
            <DataTable
              columns={['userId', 'order', 'amount']}
              rows={DEFAULT_INNER.map(r => [r.userId, r.order, r.amount])}
              pkColumns={['userId']}
              accentColor="green"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Cost Complexity</div>
            {[
              { label: 'Nested Loop', cost: 'O(n x m)', variant: 'error' },
              { label: 'Hash Join',   cost: 'O(n + m)', variant: 'success' },
              { label: 'Merge Join',  cost: 'O(n + m)*', variant: 'warning' },
            ].map(c => (
              <div key={c.label} className="flex justify-between text-xs">
                <span className="text-slate-400">{c.label}</span>
                <StatusBadge variant={c.variant}>{c.cost}</StatusBadge>
              </div>
            ))}
            <p className="text-[10px] text-db-muted">*after sort O(n log n + m log m)</p>
          </div>
        </div>
      }

      center={
        <div className="space-y-4">
          {/* Three algorithm columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ALGOS.map(algo => (
              <AlgoColumn key={algo.key} algoMeta={algo}
                steps={algo.key === 'nl' ? nlSteps : algo.key === 'hj' ? hjSteps : mjSteps}
                cursor={cursor}
                maxStep={maxStep}
              />
            ))}
          </div>

          {cursor < 0 && (
            <div className="text-center py-10 text-db-muted text-sm">Press Play to start the side-by-side comparison</div>
          )}

          {/* Step explanation */}
          {cursor >= 0 && (
            <motion.div key={cursor} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-db-card border border-db-border rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ALGOS.map(algo => (
                  <div key={algo.key} className="space-y-1">
                    <div className={`text-xs font-semibold ${algo.color}`}>{algo.label}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentSteps[algo.key]?.explanation}
                    </p>
                  </div>
                ))}
              </div>
              {!playing && (
                <AIExplainer
                  key={`joins-${cursor}`}
                  simulation="Join Algorithms"
                  step={{ explanation: combinedExplanation }}
                  stepIndex={cursor}
                  totalSteps={maxStep + 1}
                />
              )}
            </motion.div>
          )}

          {/* Final results comparison — shown when all algorithms finish */}
          {isDone && (
            <FinalComparison nlSteps={nlSteps} hjSteps={hjSteps} mjSteps={mjSteps} />
          )}

          {/* Pseudocode — always visible below, no scrolling */}
          <div className="bg-db-card border border-db-border rounded-2xl overflow-hidden">
            <div className="border-b border-db-border px-5 py-3 flex items-center gap-1">
              {ALGOS.map(a => (
                <button key={a.key} onClick={() => setActiveCode(a.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors
                    ${activeCode === a.key ? `${a.color} bg-db-bg` : 'text-db-muted hover:text-slate-300'}`}>
                  {a.label}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-db-muted font-mono">pseudocode</span>
            </div>
            <CodePanel
              code={{ nl: NL_CODE, hj: HJ_CODE, mj: MJ_CODE }[activeCode]}
              highlightLine={
                cursor >= 0 ? (currentSteps[activeCode]?.highlightLine ?? -1)
                : -1
              }
            />
          </div>
        </div>
      }

      timeline={
        <div className="bg-db-surface border border-db-border rounded-xl p-4 space-y-3">
          <div className="h-1 bg-db-border rounded-full overflow-hidden">
            <div className="h-full bg-db-blue transition-all"
              style={{ width: `${maxStep > 0 ? ((cursor + 1) / (maxStep + 1)) * 100 : 0}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { stop(); setCursor(-1) }}
              className="p-1.5 rounded-lg text-db-muted hover:text-white hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => { stop(); setCursor(c => Math.max(c - 1, -1)) }} disabled={cursor < 0}
              className="p-1.5 rounded-lg text-db-muted hover:text-white disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {playing
              ? <button onClick={stop} className="px-4 py-1.5 bg-db-blue text-white rounded-lg text-sm font-medium">Pause</button>
              : <button onClick={handlePlay} disabled={cursor >= maxStep}
                  className="px-4 py-1.5 bg-db-blue disabled:opacity-30 text-white rounded-lg text-sm font-medium">Play</button>}
            <button onClick={() => { stop(); setCursor(c => Math.min(c + 1, maxStep)) }} disabled={cursor >= maxStep}
              className="p-1.5 rounded-lg text-db-muted hover:text-white disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-xs text-db-muted font-mono ml-auto">
              {cursor >= 0 ? `Progress ${cursor + 1} / ${maxStep + 1}` : 'not started'}
            </span>
            <div className="flex gap-1">
              {[0.5, 1, 2].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-xs font-mono ${speed === s ? 'bg-db-blue text-white' : 'text-db-muted'}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    />
  )
}
