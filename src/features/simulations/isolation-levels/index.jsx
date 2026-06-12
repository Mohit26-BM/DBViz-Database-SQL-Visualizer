import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import StatusBadge from '../core/StatusBadge'
import SimHelp from '../../../components/shared/SimHelp'
import { LEVELS, LEVEL_ANOMALIES, isolationSteps } from './engine'

const LEVEL_ACCENT = {
  'READ UNCOMMITTED': { active: 'border-db-red   bg-db-red/10',   text: 'text-db-red'   },
  'READ COMMITTED':   { active: 'border-db-amber bg-db-amber/10', text: 'text-db-amber' },
  'REPEATABLE READ':  { active: 'border-db-blue  bg-db-blue/10',  text: 'text-db-blue'  },
  'SERIALIZABLE':     { active: 'border-db-green bg-db-green/10', text: 'text-db-green' },
}

const HELP = {
  title: 'Isolation Levels',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Two transactions', text: 'T_A writes; T_B reads at various points. The isolation level controls what T_B sees.' },
        { label: 'Anomaly matrix', text: 'Shows which read anomalies are possible at the selected level.' },
        { label: 'Four levels', text: 'READ UNCOMMITTED (weakest) through SERIALIZABLE (strongest).' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Select a level', text: 'Click any level button to load its scenario.' },
        { label: 'Step through', text: 'Use Play or arrows to watch each transaction action in sequence.' },
        { label: 'Event banner', text: 'Red = anomaly occurred; green = protected.' },
      ],
    },
    {
      heading: 'Anomaly definitions',
      items: [
        { label: 'Dirty Read', text: 'Reading an uncommitted value that may be rolled back.' },
        { label: 'Non-Repeatable', text: 'The same row returns a different value on re-read within one transaction.' },
        { label: 'Phantom', text: 'A range query returns different rows because another transaction inserted/deleted.' },
      ],
    },
  ],
}

function TxPanel({ label, txState, active }) {
  if (!txState) return null
  const isActive   = txState.state === 'active'
  const isCommitted = txState.state === 'committed'
  return (
    <div className={`rounded-xl border-2 p-4 space-y-2 transition-all duration-300
      ${isActive ? active : isCommitted ? 'border-db-green/40 bg-db-green/5' : 'border-db-border bg-db-surface'}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm text-white">{label}</span>
        <StatusBadge variant={isActive ? 'info' : isCommitted ? 'success' : 'neutral'}>
          {txState.state}
        </StatusBadge>
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
  const a = LEVEL_ANOMALIES[level]
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-center">
      {[['Dirty Read', a.dirtyRead], ['Non-Repeatable', a.nonRepeatableRead], ['Phantom Read', a.phantomRead]].map(([name, occurs]) => (
        <div key={name} className={`rounded-lg py-2 px-1 border
          ${occurs ? 'bg-db-red/10 border-db-red/30 text-db-red' : 'bg-db-green/10 border-db-green/30 text-db-green'}`}>
          <div className="font-bold">{occurs ? 'x' : 'v'}</div>
          <div className="text-[10px] mt-0.5">{name}</div>
        </div>
      ))}
    </div>
  )
}

export default function IsolationLevelsPage() {
  const [level, setLevel] = useState('READ COMMITTED')

  return (
    <SimulationPlayer
      title="Isolation Levels"
      subtitle="See dirty reads, phantom reads, and non-repeatable reads across all four levels"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}

      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Isolation Level</div>
            {LEVELS.map(lvl => {
              const acc = LEVEL_ACCENT[lvl]
              return (
                <button key={lvl} onClick={() => { setLevel(lvl); reset(isolationSteps(lvl)) }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono border transition-all
                    ${level === lvl ? `${acc.active} ${acc.text}` : 'border-db-border text-slate-400 hover:text-white hover:border-slate-500'}`}>
                  {lvl}
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Anomaly Matrix</div>
            <AnomalyMatrix level={level} />
          </div>

          {step && (
            <div className="bg-db-bg border border-db-border rounded-xl p-4 text-center">
              <div className="text-xs text-db-muted mb-1">Database Value</div>
              <div className="text-3xl font-bold font-mono text-white">{step.dbValue}</div>
              <div className="text-xs text-db-muted mt-1">balance</div>
            </div>
          )}
        </div>
      )}

      renderCenter={({ step, currentStep }) => {
        const acc = LEVEL_ACCENT[level]
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TxPanel label="Transaction A" txState={step?.txA} active={`${acc.active} ${acc.text}`} />
              <TxPanel label="Transaction B" txState={step?.txB} active={`${acc.active} ${acc.text}`} />
            </div>

            <AnimatePresence mode="wait">
              {step?.event && !['init', 'done'].includes(step.event) && (
                <motion.div key={step.event + currentStep}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-xl border px-4 py-3 text-sm font-mono
                    ${step.event.includes('dirty') || step.event.includes('non-repeatable')
                      ? 'bg-db-red/10 border-db-red/30 text-db-red'
                      : step.event.includes('clean') || step.event.includes('repeatable-read') || step.event.includes('commit')
                      ? 'bg-db-green/10 border-db-green/30 text-db-green'
                      : 'bg-db-surface border-db-border text-slate-300'}`}>
                  {step.event.replace(/-/g, ' ').toUpperCase()}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step && (
                <motion.div key={currentStep}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-db-card border border-db-border rounded-xl p-5 space-y-3">
                  <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                  <div className="border-t border-db-border pt-3">
                    <span className="text-[10px] text-db-green font-mono uppercase tracking-widest">Why?</span>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.why}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!step && (
              <div className="text-center py-16 text-db-muted text-sm">
                Select an isolation level above to start the simulation
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
