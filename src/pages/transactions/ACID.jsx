import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import { usePlayer } from '../../hooks/usePlayer'
import { ACID_PROPERTIES, PROPERTY_META, acidSteps } from '../../simulation/acid'

const ACCENT = {
  blue:   { text: 'text-db-blue',   border: 'border-db-blue',   bg: 'bg-db-blue/10',   active: 'border-db-blue bg-db-blue/10 text-db-blue' },
  purple: { text: 'text-db-purple', border: 'border-db-purple', bg: 'bg-db-purple/10', active: 'border-db-purple bg-db-purple/10 text-db-purple' },
  green:  { text: 'text-db-green',  border: 'border-db-green',  bg: 'bg-db-green/10',  active: 'border-db-green bg-db-green/10 text-db-green' },
  amber:  { text: 'text-db-amber',  border: 'border-db-amber',  bg: 'bg-db-amber/10',  active: 'border-db-amber bg-db-amber/10 text-db-amber' },
}

const HELP = {
  title: 'ACID Properties',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Atomicity', text: 'Simulates a partial transaction crash and subsequent rollback.' },
        { label: 'Consistency', text: 'Shows how a balance-sum constraint holds before and after a transfer.' },
        { label: 'Isolation', text: 'Two concurrent transactions — shows why dirty reads are prevented.' },
        { label: 'Durability', text: 'Write-Ahead Log flow and crash recovery restoring the committed value.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Select a property', text: 'Click any ACID button on the left to load that scenario.' },
        { label: 'Step through', text: 'Use Play or the arrow buttons to advance through each event.' },
        { label: 'Failure steps', text: 'Red-highlighted steps indicate a crash or partial failure event.' },
      ],
    },
  ],
}

function DbState({ dbState, accentColor }) {
  const acc = ACCENT[accentColor]
  const entries = typeof dbState === 'object' ? Object.entries(dbState) : [['value', dbState]]
  return (
    <div className={`rounded-xl border ${acc.border}/40 ${acc.bg} p-4`}>
      <div className={`text-[10px] font-mono uppercase tracking-widest mb-3 ${acc.text}`}>Database State</div>
      <div className="space-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm font-mono">
            <span className="text-slate-400">{k}</span>
            <span className="text-white font-bold">{typeof v === 'number' ? `$${v}` : String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TxLog({ log }) {
  return (
    <div className="space-y-1">
      {log.map((line, i) => {
        const isCrash = line.includes('CRASH') || line.includes('FAILURE') || line.includes('ROLLBACK')
        const isCommit = line.includes('COMMIT')
        const isWal = line.includes('WAL') || line.includes('Write-Ahead')
        return (
          <div key={i} className={`text-xs font-mono px-3 py-1.5 rounded-lg border
            ${isCrash  ? 'bg-db-red/10 border-db-red/30 text-db-red'
            : isCommit ? 'bg-db-green/10 border-db-green/30 text-db-green'
            : isWal    ? 'bg-db-amber/10 border-db-amber/30 text-db-amber'
            : 'bg-db-bg border-db-border text-slate-400'}`}>
            {line}
          </div>
        )
      })}
    </div>
  )
}

export default function ACID() {
  const [property, setProperty] = useState('Atomicity')
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = usePlayer()
  const step = steps[currentStep] ?? null
  const meta = PROPERTY_META[property]
  const acc = ACCENT[meta.color]

  function handleSelect(prop) {
    setProperty(prop)
    reset(acidSteps(prop))
  }

  return (
    <SimLayout
      title="ACID Properties"
      subtitle="Walk through each property with a concrete failure or success scenario"
      accentColor={meta.color}
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Property</div>
            {ACID_PROPERTIES.map(prop => {
              const m = PROPERTY_META[prop]
              const a = ACCENT[m.color]
              return (
                <button
                  key={prop}
                  onClick={() => handleSelect(prop)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono border transition-all
                    ${property === prop ? a.active : 'border-db-border text-slate-400 hover:text-white hover:border-slate-500'}`}
                >
                  {prop}
                </button>
              )
            })}
          </div>

          <div className={`rounded-xl border ${acc.border}/30 ${acc.bg} p-4`}>
            <div className={`text-xs font-medium ${acc.text} mb-1`}>{property}</div>
            <p className="text-xs text-slate-400 leading-relaxed">{meta.tagline}</p>
          </div>

          {step && <DbState dbState={step.dbState} accentColor={meta.color} />}
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Transaction log */}
          <div className="bg-db-card border border-db-border rounded-2xl p-5">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-3">Transaction Log</div>
            {step ? (
              <TxLog log={step.txLog} />
            ) : (
              <div className="text-center py-8 text-db-muted text-sm">
                Select a property and press Play to start
              </div>
            )}
          </div>

          {/* Event banner */}
          <AnimatePresence mode="wait">
            {step?.isFailure && (
              <motion.div
                key="failure"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border bg-db-red/10 border-db-red/30 text-db-red px-4 py-3 text-sm font-mono"
              >
                FAILURE EVENT — {step.event.replace(/-/g, ' ').toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explanation */}
          <AnimatePresence mode="wait">
            {step && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-db-card border border-db-border rounded-xl p-5 space-y-3"
              >
                <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                <div className="border-t border-db-border pt-3">
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${acc.text}`}>Why?</span>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.why}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
