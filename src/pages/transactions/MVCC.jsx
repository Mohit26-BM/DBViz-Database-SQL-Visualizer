import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import { usePlayer } from '../../hooks/usePlayer'
import { mvccSteps } from '../../simulation/mvcc'

const HELP = {
  title: 'MVCC',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Version chain', text: 'Each UPDATE creates a new row version rather than modifying in place. Old versions are kept until no transaction needs them.' },
        { label: 'xmin / xmax', text: 'xmin = the transaction that created this version. xmax = the transaction that superseded it (0 = still live).' },
        { label: 'Snapshot visibility', text: 'A transaction only sees versions where xmin <= its snapshot txid and xmax = 0 or xmax > its snapshot txid.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Press Start', text: 'Transactions are pre-scripted. Use Play or arrow buttons to step through.' },
        { label: 'Version chain', text: 'Watch old versions accumulate as updates happen. Dead versions are grayed out.' },
        { label: 'Visibility highlight', text: 'The green highlight shows which version is visible to the reading transaction at that step.' },
      ],
    },
    {
      heading: 'Key concepts',
      items: [
        { label: 'Readers don\'t block writers', text: 'T2 reading and T3 writing at the same time is fine — they operate on different versions.' },
        { label: 'VACUUM', text: 'Dead tuples (xmax set, no active reader) are eventually reclaimed by the background VACUUM process.' },
        { label: 'Snapshot isolation', text: 'Each transaction sees a consistent snapshot of the database as of its start time.' },
      ],
    },
  ],
}

const TX_COLORS = {
  100: { text: 'text-db-blue',   bg: 'bg-db-blue/10',   border: 'border-db-blue/40'   },
  200: { text: 'text-db-purple', bg: 'bg-db-purple/10', border: 'border-db-purple/40' },
  300: { text: 'text-db-amber',  bg: 'bg-db-amber/10',  border: 'border-db-amber/40'  },
  400: { text: 'text-db-green',  bg: 'bg-db-green/10',  border: 'border-db-green/40'  },
}

function VersionChain({ versions, visibleVersion, readTxid }) {
  return (
    <div className="space-y-2">
      {versions.map((v, i) => {
        const isVisible = v.id === visibleVersion
        const isDead = v.dead
        const tc = TX_COLORS[v.xmin] ?? {}
        return (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: isDead ? 0.4 : 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border p-4 transition-all duration-300
              ${isVisible ? 'border-db-green bg-db-green/5 ring-1 ring-db-green/30'
              : isDead    ? 'border-db-border bg-db-surface opacity-40'
              : tc.border ? `${tc.border} ${tc.bg}` : 'border-db-border bg-db-surface'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">Version {v.id}</span>
              <div className="flex gap-2">
                {isVisible && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-db-green/20 text-db-green font-mono">
                    visible to T{readTxid}
                  </span>
                )}
                {isDead && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-db-border text-slate-500 font-mono">dead</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <div className="text-slate-500">xmin</div>
                <div className={`font-bold ${tc.text ?? 'text-white'}`}>{v.xmin}</div>
              </div>
              <div>
                <div className="text-slate-500">xmax</div>
                <div className={`font-bold ${v.xmax === 0 ? 'text-db-green' : 'text-db-amber'}`}>
                  {v.xmax === 0 ? 'live' : v.xmax}
                </div>
              </div>
              <div>
                <div className="text-slate-500">balance</div>
                <div className="font-bold text-white">${v.value}</div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function TxList({ txids }) {
  return (
    <div className="space-y-2">
      {txids.map(tx => {
        const c = TX_COLORS[tx.id] ?? {}
        const isActive = tx.state === 'active'
        return (
          <div key={tx.id} className={`rounded-xl border p-3 transition-all
            ${isActive ? `${c.border ?? 'border-db-border'} ${c.bg ?? ''}` : 'border-db-border bg-db-surface opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono font-bold ${c.text ?? 'text-slate-300'}`}>txid {tx.id}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border
                ${isActive ? `${c.border ?? 'border-db-border'} ${c.text ?? 'text-slate-400'}` : 'border-db-border text-db-green'}`}>
                {tx.state}
              </span>
            </div>
            {tx.action && (
              <div className="text-xs font-mono text-slate-400 mt-1.5 bg-db-bg rounded px-2 py-1">{tx.action}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function MVCC() {
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = usePlayer()
  const step = steps[currentStep] ?? null

  function handleStart() {
    reset(mvccSteps())
  }

  return (
    <SimLayout
      title="MVCC"
      subtitle="Multi-Version Concurrency Control — how Postgres lets readers never block writers"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          {steps.length === 0 ? (
            <button onClick={handleStart}
              className="w-full py-2.5 bg-db-green hover:bg-green-400 text-white rounded-xl text-sm font-medium transition-colors">
              Start Simulation
            </button>
          ) : (
            <button onClick={handleStart}
              className="w-full py-2.5 border border-db-border text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors">
              Restart
            </button>
          )}

          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Active Transactions</div>
            {step ? <TxList txids={step.txids} /> : (
              <div className="text-xs text-db-muted py-4 text-center">No transactions yet</div>
            )}
          </div>
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Version chain */}
          <div className="bg-db-card border border-db-border rounded-2xl p-6">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-4">Heap Version Chain</div>
            {step ? (
              step.versions.length > 0
                ? <VersionChain versions={step.versions} visibleVersion={step.visibleVersion} readTxid={step.readTxid} />
                : <div className="text-center py-8 text-db-muted text-sm">No versions yet</div>
            ) : (
              <div className="text-center py-8 text-db-muted text-sm">Press Start Simulation to begin</div>
            )}
          </div>

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
                  <span className="text-[10px] text-db-green font-mono uppercase tracking-widest">Why?</span>
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
