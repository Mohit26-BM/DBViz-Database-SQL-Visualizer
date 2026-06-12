import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import { usePlayer } from '../../hooks/usePlayer'
import { deadlockSteps } from '../../simulation/deadlocks'

const HELP = {
  title: 'Deadlock Detection',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Wait-for graph', text: 'Each node is a transaction. An edge T1 → T2 means T1 is waiting for a resource T2 holds.' },
        { label: 'Cycle = deadlock', text: 'A deadlock exists if and only if the wait-for graph contains a cycle.' },
        { label: 'Victim selection', text: 'The database picks one transaction to abort (the victim), breaking the cycle.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Press Play', text: 'Transactions acquire locks one by one until a cycle forms.' },
        { label: 'Watch the graph', text: 'Edges appear as each transaction begins waiting. Red edges mark the cycle.' },
        { label: 'Resolution', text: 'The final steps show victim abort and deadlock resolution.' },
      ],
    },
    {
      heading: 'Resource table',
      items: [
        { label: 'Lock held', text: 'Colored cell shows which transaction holds each resource.' },
        { label: 'Null', text: 'Resource is free — no lock held.' },
      ],
    },
  ],
}

// SVG wait-for graph
function WaitForGraph({ graph, cycleEdges, highlight }) {
  const cycleSet = new Set(cycleEdges.map(e => `${e.from}-${e.to}`))
  const highlightSet = new Set(highlight)

  // Triangle layout for 3 nodes
  const positions = {
    T1: { x: 160, y: 40  },
    T2: { x: 40,  y: 220 },
    T3: { x: 280, y: 220 },
  }

  const R = 28

  function arrowPath(from, to) {
    const f = positions[from]
    const t = positions[to]
    const dx = t.x - f.x
    const dy = t.y - f.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / len
    const uy = dy / len
    const x1 = f.x + ux * R
    const y1 = f.y + uy * R
    const x2 = t.x - ux * (R + 8)
    const y2 = t.y - uy * (R + 8)
    return { x1, y1, x2, y2 }
  }

  return (
    <svg viewBox="0 0 320 280" className="w-full max-w-sm mx-auto" style={{ height: 240 }}>
      <defs>
        <marker id="arrow-gray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#475569" />
        </marker>
        <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
        </marker>
      </defs>

      {/* Edges */}
      {graph.edges.map((e, i) => {
        const isCycle = cycleSet.has(`${e.from}-${e.to}`)
        const { x1, y1, x2, y2 } = arrowPath(e.from, e.to)
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isCycle ? '#ef4444' : '#475569'}
              strokeWidth={isCycle ? 2.5 : 1.5}
              markerEnd={isCycle ? 'url(#arrow-red)' : 'url(#arrow-gray)'}
            />
            <text x={mx} y={my - 6} textAnchor="middle" fill={isCycle ? '#f87171' : '#64748b'}
              fontSize={9} fontFamily="JetBrains Mono, monospace">
              {e.label}
            </text>
          </g>
        )
      })}

      {/* Nodes */}
      {graph.nodes.map(node => {
        const pos = positions[node]
        const isHighlight = highlightSet.has(node)
        const isCycle = cycleSet.size > 0 && highlightSet.has(node)
        return (
          <motion.g key={node}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <circle cx={pos.x} cy={pos.y} r={R}
              fill={isCycle ? '#450a0a' : isHighlight ? '#1e3a5f' : '#1e293b'}
              stroke={isCycle ? '#ef4444' : isHighlight ? '#3b82f6' : '#334155'}
              strokeWidth={isCycle ? 2.5 : 1.5}
            />
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
              fill={isCycle ? '#fca5a5' : isHighlight ? '#93c5fd' : '#94a3b8'}
              fontSize={13} fontWeight="bold" fontFamily="JetBrains Mono, monospace">
              {node}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

function LockTable({ locks }) {
  const TX_COLORS = {
    T1: 'bg-db-blue/20 text-db-blue border-db-blue/40',
    T2: 'bg-db-purple/20 text-db-purple border-db-purple/40',
    T3: 'bg-db-amber/20 text-db-amber border-db-amber/40',
  }
  return (
    <div className="rounded-xl border border-db-border overflow-hidden">
      <div className="grid grid-cols-4 bg-db-surface text-[10px] font-mono text-db-muted uppercase tracking-widest">
        {['Resource', 'R1', 'R2', 'R3'].map(h => (
          <div key={h} className="px-3 py-2 border-b border-db-border">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-4 text-xs font-mono">
        <div className="px-3 py-2 text-slate-500">Lock holder</div>
        {['R1', 'R2', 'R3'].map(r => (
          <div key={r} className="px-3 py-2">
            {locks[r] ? (
              <span className={`px-2 py-0.5 rounded border ${TX_COLORS[locks[r]] ?? 'text-slate-400'}`}>
                {locks[r]}
              </span>
            ) : (
              <span className="text-slate-600">free</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Deadlocks() {
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = usePlayer()
  const step = steps[currentStep] ?? null

  function handleStart() {
    reset(deadlockSteps())
  }

  const isDeadlock = step?.cycleEdges?.length > 0 && !step?.resolved
  const isResolved = step?.resolved

  return (
    <SimLayout
      title="Deadlock Detection"
      subtitle="Watch the wait-for graph form a cycle, then see the victim resolution"
      accentColor="red"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          {steps.length === 0 ? (
            <button
              onClick={handleStart}
              className="w-full py-2.5 bg-db-red hover:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-full py-2.5 border border-db-border text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Restart
            </button>
          )}

          {/* Status */}
          {step && (
            <div className={`rounded-xl border px-4 py-3 text-center
              ${isDeadlock  ? 'bg-db-red/10 border-db-red/40'
              : isResolved  ? 'bg-db-green/10 border-db-green/40'
              : 'bg-db-surface border-db-border'}`}>
              <div className={`text-sm font-bold font-mono
                ${isDeadlock ? 'text-db-red' : isResolved ? 'text-db-green' : 'text-slate-300'}`}>
                {isDeadlock ? 'DEADLOCK DETECTED' : isResolved ? 'RESOLVED' : 'Running...'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">{step.event}</div>
            </div>
          )}

          {/* Lock table */}
          {step && (
            <div className="space-y-2">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Lock State</div>
              <LockTable locks={step.locks} />
            </div>
          )}

          {/* Legend */}
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Legend</div>
            {[
              { color: 'border-slate-500 bg-slate-500/10', label: 'Wait edge (normal)' },
              { color: 'border-db-red bg-db-red/10',       label: 'Cycle edge (deadlock)' },
              { color: 'border-db-blue bg-db-blue/10',     label: 'Active / highlighted' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-slate-400">
                <div className={`w-4 h-4 rounded border ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Graph canvas */}
          <div className="bg-db-card border border-db-border rounded-2xl p-6">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-4">Wait-For Graph</div>
            {step ? (
              <WaitForGraph
                graph={step.graph}
                cycleEdges={step.cycleEdges ?? []}
                highlight={step.highlight ?? []}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-db-muted text-sm">
                Press Start Simulation to begin
              </div>
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
                className={`rounded-xl border p-5 space-y-3
                  ${isDeadlock ? 'bg-db-red/5 border-db-red/30' : 'bg-db-card border-db-border'}`}
              >
                <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
                <div className="border-t border-db-border pt-3">
                  <span className="text-[10px] text-db-red font-mono uppercase tracking-widest">Why?</span>
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
