import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import StatusBadge from '../core/StatusBadge'
import SimHelp from '../../../components/shared/SimHelp'
import { mvccSteps } from './engine'

const HELP = {
  title: 'MVCC',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Version chain', text: 'Each UPDATE creates a new row version. Old versions stay until no transaction needs them.' },
        { label: 'xmin / xmax', text: 'xmin = transaction that created this version. xmax = transaction that superseded it (0 = live).' },
        { label: 'Snapshot visibility', text: 'A transaction sees only versions where xmin <= its snapshot txid and xmax is 0 or > snapshot.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Start', text: 'Transactions are pre-scripted. Use Play or arrows to step through.' },
        { label: 'Green highlight', text: 'Shows which version is visible to the reading transaction at that step.' },
        { label: 'Dead versions', text: 'Grayed-out versions are dead — no active transaction can see them. VACUUM reclaims them.' },
      ],
    },
    {
      heading: 'Key concepts',
      items: [
        { label: 'Readers never block writers', text: 'Reads and writes operate on different versions simultaneously.' },
        { label: 'VACUUM', text: 'The background process that physically removes dead tuples once no reader needs them.' },
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

// ── Version card matching user's spec: xmin, xmax, value + reader arrow ───────
function VersionCard({ v, isVisible, readTxid }) {
  const tc = TX_COLORS[v.xmin] ?? {}
  const isDead = v.dead
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: isDead ? 0.35 : 1, x: 0 }}
      className={`rounded-xl border p-4 transition-all duration-300 relative
        ${isVisible ? 'border-db-green bg-db-green/5 ring-1 ring-db-green/30'
        : isDead    ? 'border-db-border bg-db-surface'
        : tc.border ? `${tc.border} ${tc.bg}` : 'border-db-border bg-db-surface'}`}
    >
      {/* Version label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-500">Version {v.id}</span>
        <div className="flex gap-1.5">
          {isVisible && <StatusBadge variant="success">visible to T{readTxid}</StatusBadge>}
          {isDead    && <StatusBadge variant="neutral">dead — awaiting VACUUM</StatusBadge>}
        </div>
      </div>

      {/* Three fields */}
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        <div className="text-center">
          <div className="text-slate-500 mb-1">balance</div>
          <div className="text-white font-bold text-lg">${v.value}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 mb-1">xmin</div>
          <div className={`font-bold ${tc.text ?? 'text-white'}`}>{v.xmin}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 mb-1">xmax</div>
          <div className={`font-bold ${v.xmax === 0 ? 'text-db-green' : 'text-db-amber'}`}>
            {v.xmax === 0 ? 'live' : v.xmax}
          </div>
        </div>
      </div>

      {/* Reader arrow */}
      {isVisible && readTxid && (
        <div className="mt-3 pt-2.5 border-t border-db-green/20">
          <div className="text-[10px] font-mono text-db-green">
            Reader T{readTxid} sees this version (xmin={v.xmin} &lt;= {readTxid}, xmax={v.xmax === 0 ? 'live' : v.xmax})
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Down-arrow connector between versions
function ChainArrow() {
  return (
    <div className="flex justify-center text-slate-600 py-1 font-mono text-sm">|</div>
  )
}

function TxList({ txids }) {
  return (
    <div className="space-y-2">
      {txids.map(tx => {
        const c = TX_COLORS[tx.id] ?? {}
        return (
          <div key={tx.id} className={`rounded-xl border p-3 transition-all
            ${tx.state === 'active' ? `${c.border ?? 'border-db-border'} ${c.bg ?? ''}` : 'border-db-border bg-db-surface opacity-50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono font-bold ${c.text ?? 'text-slate-300'}`}>txid {tx.id}</span>
              <StatusBadge variant={tx.state === 'active' ? 'info' : 'success'}>{tx.state}</StatusBadge>
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

export default function MVCCPage() {
  return (
    <SimulationPlayer
      title="MVCC"
      subtitle="Multi-Version Concurrency Control — how readers never block writers"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}

      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button onClick={() => reset(mvccSteps())}
              className="w-full py-2.5 bg-db-green hover:bg-green-400 text-white rounded-xl text-sm font-medium transition-colors">
              Start Simulation
            </button>
          ) : (
            <button onClick={() => reset([])}
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
      )}

      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          <div className="bg-db-card border border-db-border rounded-2xl p-6">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-4">
              Heap — Version Chain
            </div>
            {step ? (
              step.versions.length > 0 ? (
                <div>
                  {step.versions.map((v, i) => (
                    <div key={v.id}>
                      {i > 0 && <ChainArrow />}
                      <VersionCard
                        v={v}
                        isVisible={v.id === step.visibleVersion}
                        readTxid={step.readTxid}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-db-muted text-sm">No versions yet</div>
              )
            ) : (
              <div className="text-center py-8 text-db-muted text-sm">Press Start Simulation to begin</div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step && (
              <motion.div key={currentStep}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-db-card border border-db-border rounded-xl p-5 space-y-3">
                <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                <div className="border-t border-db-border pt-3">
                  <span className="text-[10px] text-db-green font-mono uppercase tracking-widest">Why?</span>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{step.why}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    />
  )
}
