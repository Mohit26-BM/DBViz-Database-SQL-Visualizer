import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import Controls from '../../components/shared/Controls'
import CodePanel from '../../components/shared/CodePanel'
import { usePlayer } from '../../hooks/usePlayer'
import { bPlusTreeSteps, BPLUS_CODE } from '../../simulation/bplustree'

const HELP = {
  title: 'B+ Tree Simulator',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Tree of order 2', text: 'Each internal node holds at most 2 keys; leaves hold data and form a linked list.' },
        { label: 'Node split', text: 'When a node overflows its capacity, it splits and the middle key is promoted to the parent.' },
        { label: 'Internal vs Leaf', text: 'Blue nodes are internal routers; green nodes store the actual data records.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Enter keys', text: 'Type space- or comma-separated integers in the input box (e.g. 10 20 5 6 12).' },
        { label: 'Build Tree', text: 'Click Build Tree to generate the step-by-step insertion trace.' },
        { label: 'Step through', text: 'Use Play/Pause or the arrow buttons to move through each insert and split event.' },
      ],
    },
    {
      heading: 'Reading the tree',
      items: [
        { label: 'Highlighted node', text: 'The node currently being traversed or split is highlighted with a brighter border.' },
        { label: 'Why panel', text: 'Each step explains the structural reason behind the action.' },
        { label: 'Code panel', text: 'The pseudocode on the right highlights the line executing at each step.' },
      ],
    },
  ],
}

const DEFAULT_KEYS = [10, 20, 5, 6, 12, 30, 7, 17]
const COLORS = { purple: '#8B5CF6', green: '#22C55E', amber: '#F59E0B' }

// ── Tree Renderer ─────────────────────────────────────────────────────────────
function TreeView({ treeNodes, highlightNodeIds = [] }) {
  if (!treeNodes || treeNodes.length === 0) return (
    <div className="flex items-center justify-center h-48 text-db-muted text-sm">Empty tree</div>
  )

  const levels = {}
  treeNodes.forEach(n => { (levels[n.level] = levels[n.level] || []).push(n) })
  const maxLevel = Math.max(...Object.keys(levels).map(Number))

  // Position nodes horizontally per level
  const positioned = {}
  const SLOT_W = 100

  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const nodes = levels[lvl] || []
    const totalW = nodes.length * SLOT_W
    nodes.forEach((n, i) => {
      positioned[n.id] = { x: -totalW / 2 + i * SLOT_W + SLOT_W / 2, y: lvl * 120 }
    })
  }

  const svgW = Math.max(600, (levels[maxLevel]?.length ?? 1) * SLOT_W + 100)
  const svgH = (maxLevel + 1) * 120 + 60

  return (
    <div className="overflow-auto">
      <svg width={svgW} height={svgH} style={{ display: 'block', margin: '0 auto' }}>
        <g transform={`translate(${svgW / 2}, 30)`}>
          {/* Edges */}
          {treeNodes.map(node =>
            node.childIds.map(cid => {
              const from = positioned[node.id]
              const to = positioned[cid]
              if (!from || !to) return null
              return (
                <line key={`${node.id}-${cid}`}
                  x1={from.x} y1={from.y + 30}
                  x2={to.x}   y2={to.y}
                  stroke="#334155" strokeWidth={1.5} strokeDasharray="4 3"
                />
              )
            })
          )}

          {/* Nodes */}
          {treeNodes.map(node => {
            const pos = positioned[node.id]
            if (!pos) return null
            const isHighlighted = highlightNodeIds.includes(node.id)
            const keyW = 40
            const nodeW = keyW * node.keys.length
            const nodeH = 30

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {/* Background */}
                <rect
                  x={pos.x - nodeW / 2} y={pos.y}
                  width={nodeW} height={nodeH}
                  rx={6}
                  fill={node.isLeaf
                    ? (isHighlighted ? '#14532d' : '#0f2d1d')
                    : (isHighlighted ? '#1e3a8a' : '#1e293b')}
                  stroke={node.isLeaf
                    ? (isHighlighted ? '#4ade80' : '#22c55e')
                    : (isHighlighted ? '#60a5fa' : '#3b82f6')}
                  strokeWidth={isHighlighted ? 2 : 1.5}
                />

                {/* Keys */}
                {node.keys.map((k, i) => (
                  <g key={i}>
                    {i > 0 && (
                      <line
                        x1={pos.x - nodeW / 2 + keyW * i} y1={pos.y + 4}
                        x2={pos.x - nodeW / 2 + keyW * i} y2={pos.y + nodeH - 4}
                        stroke={node.isLeaf ? '#22c55e' : '#3b82f6'} strokeWidth={1}
                      />
                    )}
                    <text
                      x={pos.x - nodeW / 2 + keyW * i + keyW / 2}
                      y={pos.y + nodeH / 2 + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={node.isLeaf ? '#bbf7d0' : '#bfdbfe'}
                      fontSize={13} fontWeight="bold" fontFamily="JetBrains Mono, monospace"
                    >
                      {k}
                    </text>
                  </g>
                ))}

                {/* Leaf label */}
                {node.isLeaf && (
                  <text
                    x={pos.x} y={pos.y + nodeH + 14}
                    textAnchor="middle" fill="#334155"
                    fontSize={9} fontFamily="Inter, sans-serif"
                  >
                    leaf
                  </text>
                )}
              </motion.g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BPlusTree() {
  const [keyInput, setKeyInput] = useState(DEFAULT_KEYS.join(' '))
  const [error, setError] = useState('')
  const { steps, currentStep, playing, speed, play, pause, stepForward, stepBack, reset, changeSpeed } = usePlayer()

  const step = steps[currentStep] ?? null

  function handleRun() {
    const keys = keyInput.trim().split(/[\s,]+/).map(Number)
    if (keys.some(isNaN) || keys.length < 1) { setError('Enter space-separated integers'); return }
    setError('')
    reset(bPlusTreeSteps(keys))
  }

  const actionColor = {
    init: 'text-db-muted',
    search: 'text-db-blue',
    'found-leaf': 'text-db-amber',
    insert: 'text-db-green',
    split: 'text-db-purple',
  }

  return (
    <SimLayout
      title="B+ Tree Simulator"
      subtitle="Visualize insertions, splits and merges in a B+ tree of order 2"
      accentColor="purple"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs text-db-muted font-mono uppercase tracking-widest">Keys to Insert</label>
            <textarea
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setError('') }}
              rows={3}
              className="w-full bg-db-bg border border-db-border text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-db-blue resize-none"
            />
            {error && <p className="text-xs text-db-red">{error}</p>}
            <button onClick={handleRun}
              className="w-full py-2 bg-db-purple hover:bg-violet-400 text-white rounded-lg text-sm font-medium transition-colors">
              Build Tree
            </button>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Legend</div>
            {[
              { color: 'border-db-blue bg-db-blue/10',   label: 'Internal node (routing)' },
              { color: 'border-db-green bg-db-green/10', label: 'Leaf node (data)' },
              { color: 'border-violet-400 bg-violet-500/10', label: 'Active / highlighted' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-slate-400">
                <div className={`w-4 h-4 rounded border ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Step info */}
          {step && (
            <div className="space-y-2">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Current Action</div>
              <span className={`text-sm font-mono font-bold capitalize ${actionColor[step.action] ?? 'text-white'}`}>
                {step.action?.replace('-', ' ')}
              </span>
              {step.key !== null && (
                <div className="text-xs text-slate-400">Key: <span className="text-white font-mono">{step.key}</span></div>
              )}
            </div>
          )}
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Tree visualization */}
          <div className="bg-db-card border border-db-border rounded-2xl p-6 min-h-64">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-4">Tree Structure</div>
            <TreeView treeNodes={step?.tree ?? []} highlightNodeIds={step?.highlightNodeIds ?? []} />
          </div>

          {/* Step explanation */}
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
                  <span className="text-[10px] text-db-purple font-mono uppercase tracking-widest">Why?</span>
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
      rightPanel={
        <CodePanel
          code={BPLUS_CODE}
          highlightLine={step?.highlightLine ?? -1}
        />
      }
    />
  )
}
