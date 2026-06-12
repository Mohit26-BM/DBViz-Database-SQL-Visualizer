import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import StatusBadge from '../core/StatusBadge'
import SimHelp from '../../../components/shared/SimHelp'
import { deadlockSteps } from './engine'

const HELP = {
  title: 'Deadlock Detection',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Transaction cards', text: 'Each card shows which resources the transaction holds and which it is waiting for.' },
        { label: 'Wait-for arrows', text: 'Arrows between cards show lock-wait dependencies. A cycle means deadlock.' },
        { label: 'Victim selection', text: 'The database aborts one transaction to break the cycle. The victim reruns after the others complete.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Start Simulation', text: 'Transactions acquire locks one by one until a cycle forms.' },
        { label: 'Step through', text: 'Use Play or the arrows. Watch cards update as each lock is acquired or waited on.' },
        { label: 'Cycle highlight', text: 'When deadlock is detected, all cards in the cycle turn red.' },
      ],
    },
  ],
}

const TX_COLORS = {
  T1: { text: 'text-db-blue',   border: 'border-db-blue',   bg: 'bg-db-blue/10',   cycle: 'border-db-red bg-db-red/10 text-db-red' },
  T2: { text: 'text-db-purple', border: 'border-db-purple', bg: 'bg-db-purple/10', cycle: 'border-db-red bg-db-red/10 text-db-red' },
  T3: { text: 'text-db-green',  border: 'border-db-green',  bg: 'bg-db-green/10',  cycle: 'border-db-red bg-db-red/10 text-db-red' },
}

function TxCard({ tx, inCycle, isVictim }) {
  const c = TX_COLORS[tx.id] ?? {}
  const borderCls = isVictim
    ? 'border-slate-600 bg-slate-700/30 opacity-40'
    : inCycle
    ? c.cycle
    : `${c.border} ${c.bg}`

  return (
    <motion.div
      layout
      className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-300 ${borderCls}`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono font-bold text-sm ${inCycle && !isVictim ? 'text-db-red' : c.text}`}>{tx.id}</span>
        {isVictim && <StatusBadge variant="neutral">aborted</StatusBadge>}
        {inCycle && !isVictim && <StatusBadge variant="error">deadlocked</StatusBadge>}
      </div>

      <div className="space-y-1.5 text-xs font-mono">
        <div>
          <span className="text-slate-500">Holding: </span>
          {tx.holding.length > 0
            ? tx.holding.map(r => (
                <span key={r} className={`mr-1 px-1.5 py-0.5 rounded border ${c.border} ${c.text} ${c.bg}`}>{r}</span>
              ))
            : <span className="text-slate-600">nothing</span>}
        </div>
        <div>
          <span className="text-slate-500">Waiting: </span>
          {tx.waitingFor
            ? <span className={`px-1.5 py-0.5 rounded border border-db-amber text-db-amber bg-db-amber/10`}>{tx.waitingFor}</span>
            : <span className="text-slate-600">—</span>}
        </div>
      </div>
    </motion.div>
  )
}

// Simple SVG cycle arrows between cards (positioned by ID)
function CycleArrows({ transactions, cycleIds, resolved }) {
  if (cycleIds.length === 0 || resolved) return null
  const cycleSet = new Set(cycleIds)
  const waitEdges = transactions
    .filter(t => t.waitingFor && cycleSet.has(t.id))
    .map(t => {
      const target = transactions.find(tt => tt.holding.includes(t.waitingFor ?? ''))
      return target ? { from: t.id, to: target.id, label: `${t.id} waits for ${t.waitingFor}` } : null
    })
    .filter(Boolean)

  return (
    <div className="space-y-1">
      {waitEdges.map(e => (
        <div key={`${e.from}-${e.to}`}
          className="flex items-center gap-2 text-xs font-mono text-db-red bg-db-red/10 border border-db-red/30 rounded-lg px-3 py-2">
          {e.label} <span className="ml-auto">→</span>
        </div>
      ))}
      <div className="text-[10px] text-db-red font-mono text-center pt-1">
        cycle: {cycleIds.join(' → ')} → {cycleIds[0]}
      </div>
    </div>
  )
}

function LockTable({ resources }) {
  const TX_TEXT = { T1: 'text-db-blue', T2: 'text-db-purple', T3: 'text-db-green' }
  return (
    <div className="space-y-1">
      {resources.map(r => (
        <div key={r.id} className="flex items-center justify-between text-xs font-mono px-3 py-1.5 bg-db-bg border border-db-border rounded-lg">
          <span className="text-slate-400">{r.id}</span>
          {r.heldBy
            ? <span className={`font-bold ${TX_TEXT[r.heldBy] ?? 'text-white'}`}>{r.heldBy}</span>
            : <span className="text-slate-600">free</span>}
        </div>
      ))}
    </div>
  )
}

export default function DeadlocksPage() {
  return (
    <SimulationPlayer
      title="Deadlock Detection"
      subtitle="Watch the wait-for cycle form, then see the victim resolution"
      accentColor="red"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}

      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step
            ? (
              <button onClick={() => reset(deadlockSteps())}
                className="w-full py-2.5 bg-db-red hover:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors">
                Start Simulation
              </button>
            ) : (
              <button onClick={() => reset([])}
                className="w-full py-2.5 border border-db-border text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors">
                Restart
              </button>
            )}

          {step && (
            <>
              <AnimatePresence mode="wait">
                <motion.div key={step.event}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-xl border px-4 py-3 text-center
                    ${step.cycleExists && !step.resolved ? 'bg-db-red/10 border-db-red/40'
                    : step.resolved ? 'bg-db-green/10 border-db-green/40'
                    : 'bg-db-surface border-db-border'}`}>
                  <div className={`text-sm font-bold font-mono
                    ${step.cycleExists && !step.resolved ? 'text-db-red'
                    : step.resolved ? 'text-db-green' : 'text-slate-300'}`}>
                    {step.cycleExists && !step.resolved ? 'DEADLOCK'
                    : step.resolved ? 'RESOLVED' : 'RUNNING'}
                  </div>
                  {step.victim && (
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">victim: {step.victim}</div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="space-y-2">
                <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Resource Locks</div>
                <LockTable resources={step.resources} />
              </div>
            </>
          )}
        </div>
      )}

      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          {step ? (
            <>
              {/* Transaction cards */}
              <div className="grid grid-cols-3 gap-4">
                {step.transactions.map(tx => (
                  <TxCard
                    key={tx.id}
                    tx={tx}
                    inCycle={step.cycleExists && step.cycleIds.includes(tx.id)}
                    isVictim={tx.state === 'victim'}
                  />
                ))}
              </div>

              {/* Wait-for cycle banner */}
              <AnimatePresence mode="wait">
                {step.cycleExists && (
                  <motion.div key="cycle"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <CycleArrows
                      transactions={step.transactions}
                      cycleIds={step.cycleIds}
                      resolved={step.resolved}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Explanation */}
              <AnimatePresence mode="wait">
                <motion.div key={currentStep}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-xl border p-5 space-y-3
                    ${step.cycleExists && !step.resolved ? 'bg-db-red/5 border-db-red/30' : 'bg-db-card border-db-border'}`}>
                  <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                  <div className="border-t border-db-border pt-3">
                    <span className="text-[10px] text-db-red font-mono uppercase tracking-widest">Why?</span>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.why}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-db-muted text-sm">
              Press Start Simulation to begin
            </div>
          )}
        </div>
      )}
    />
  )
}
