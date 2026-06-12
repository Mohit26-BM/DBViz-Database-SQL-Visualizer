import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import { usePlayer } from '../../hooks/usePlayer'
import { LEVELS, LEVEL_ANOMALIES, isolationSteps } from '../../simulation/isolationLevels'

const HELP = {
  title: 'Isolation Levels',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Two transactions', text: 'Transaction A writes a value; Transaction B reads it at various points. The isolation level controls what B sees.' },
        { label: 'Anomaly matrix', text: 'The three cells show which read anomalies are possible at the selected level.' },
        { label: 'Four levels', text: 'READ UNCOMMITTED (weakest) through SERIALIZABLE (strongest).' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Select a level', text: 'Click any isolation level button on the left to load its scenario.' },
        { label: 'Step through', text: 'Use Play or the arrows to watch each transaction action in sequence.' },
        { label: 'Event banner', text: 'Red banners indicate an anomaly occurring; green banners indicate protection.' },
      ],
    },
    {
      heading: 'Anomalies explained',
      items: [
        { label: 'Dirty Read', text: 'Reading an uncommitted value that may later be rolled back.' },
        { label: 'Non-Repeatable Read', text: 'Re-reading the same row gets a different value within the same transaction.' },
        { label: 'Phantom Read', text: 'A range query returns different rows on re-execution because another transaction inserted/deleted rows.' },
      ],
    },
  ],
}

const LEVEL_COLORS = {
  'READ UNCOMMITTED': { active: 'border-db-red   bg-db-red/10   text-db-red',   badge: 'bg-db-red/15 text-db-red'   },
  'READ COMMITTED':   { active: 'border-db-amber bg-db-amber/10 text-db-amber', badge: 'bg-db-amber/15 text-db-amber' },
  'REPEATABLE READ':  { active: 'border-db-blue  bg-db-blue/10  text-db-blue',  badge: 'bg-db-blue/15 text-db-blue'  },
  'SERIALIZABLE':     { active: 'border-db-green bg-db-green/10 text-db-green', badge: 'bg-db-green/15 text-db-green' },
}

const EVENT_COLORS = {
  'init':               'text-db-muted',
  'tx-a-begin':         'text-db-blue',
  'tx-a-update':        'text-db-amber',
  'dirty-read':         'text-db-red',
  'clean-read':         'text-db-green',
  'tx-a-commit':        'text-db-green',
  'non-repeatable-read':'text-db-red',
  'repeatable-read':    'text-db-green',
  'done':               'text-db-muted',
}

function TxPanel({ label, txState, color }) {
  if (!txState) return null
  const isActive = txState.state === 'active'
  const isDone   = txState.state === 'committed'

  return (
    <div className={`rounded-xl border-2 p-4 transition-all duration-300 space-y-2
      ${isActive ? color : isDone ? 'border-db-green/40 bg-db-green/5' : 'border-db-border bg-db-surface'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm text-white">{label}</span>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border
          ${isActive ? color : isDone ? 'border-db-green text-db-green' : 'border-db-border text-db-muted'}`}>
          {txState.state?.toUpperCase()}
        </span>
      </div>
      {txState.action && (
        <div className="text-xs font-mono text-slate-300 bg-db-bg rounded-lg px-3 py-2 leading-relaxed">
          {txState.action}
        </div>
      )}
    </div>
  )
}

function AnomalyMatrix({ level }) {
  const anomalies = LEVEL_ANOMALIES[level]
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-center">
      {[
        ['Dirty Read',         anomalies.dirtyRead],
        ['Non-Repeatable',     anomalies.nonRepeatableRead],
        ['Phantom Read',       anomalies.phantomRead],
      ].map(([name, occurs]) => (
        <div key={name} className={`rounded-lg py-2 px-1 border
          ${occurs ? 'bg-db-red/10 border-db-red/30 text-db-red' : 'bg-db-green/10 border-db-green/30 text-db-green'}`}>
          <div className="font-bold">{occurs ? '✗' : '✓'}</div>
          <div className="text-[10px] mt-0.5">{name}</div>
        </div>
      ))}
    </div>
  )
}

export default function IsolationLevels() {
  const [level, setLevel] = useState('READ COMMITTED')
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = usePlayer()
  const step = steps[currentStep] ?? null

  function handleRun(lvl) {
    setLevel(lvl)
    reset(isolationSteps(lvl))
  }

  const lc = LEVEL_COLORS[level]

  return (
    <SimLayout
      title="Isolation Levels"
      subtitle="See dirty reads, phantom reads, and non-repeatable reads across all four levels"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Isolation Level</div>
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => handleRun(lvl)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono border transition-all
                  ${level === lvl ? LEVEL_COLORS[lvl].active : 'border-db-border text-slate-400 hover:text-white hover:border-slate-500'}`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Anomaly matrix */}
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Anomaly Matrix</div>
            <AnomalyMatrix level={level} />
          </div>

          {/* DB value */}
          {step && (
            <div className="bg-db-bg border border-db-border rounded-xl p-4 text-center">
              <div className="text-xs text-db-muted mb-1">Database Value</div>
              <div className="text-3xl font-bold font-mono text-white">{step.dbValue}</div>
              <div className="text-xs text-db-muted mt-1">balance</div>
            </div>
          )}
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Transaction lanes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TxPanel label="Transaction A" txState={step?.txA} color={lc.active} />
            <TxPanel label="Transaction B" txState={step?.txB} color={lc.active} />
          </div>

          {/* Event banner */}
          <AnimatePresence mode="wait">
            {step?.event && step.event !== 'init' && step.event !== 'done' && (
              <motion.div
                key={step.event + currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl border px-4 py-3 text-sm font-mono
                  ${step.event.includes('dirty-read') || step.event.includes('non-repeatable')
                    ? 'bg-db-red/10 border-db-red/30 text-db-red'
                    : step.event.includes('clean') || step.event.includes('repeatable-read') || step.event.includes('commit')
                    ? 'bg-db-green/10 border-db-green/30 text-db-green'
                    : 'bg-db-surface border-db-border text-slate-300'}`}
              >
                {step.event.replace(/-/g, ' ').toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explanation */}
          <AnimatePresence mode="wait">
            {step && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-db-card border border-db-border rounded-xl p-5 space-y-3"
              >
                <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                <div className="border-t border-db-border pt-3">
                  <span className="text-[10px] text-db-green font-mono uppercase tracking-widest">Why?</span>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.why}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {steps.length === 0 && (
            <div className="text-center py-16 text-db-muted text-sm">
              Select an isolation level above to start the simulation
            </div>
          )}
        </div>
      }
      timeline={steps.length > 0 && (
        <Controls
          playing={playing} onPlay={play} onPause={pause}
          onForward={stepForward} onBack={stepBack}
          onReset={() => reset([])}
          current={currentStep} max={steps.length - 1}
          speed={speed} onSpeedChange={changeSpeed}
        />
      )}
    />
  )
}
