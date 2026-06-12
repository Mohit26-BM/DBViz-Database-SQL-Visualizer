import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import StatusBadge from '../core/StatusBadge'
import { bTreeSteps, BTREE_CODE, MIN_DEGREE } from './engine'

const DEFAULT_KEYS = [10, 20, 5, 6, 12, 30, 7, 17]

const HELP = {
  title: 'B-tree Simulator',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Records everywhere', text: 'Unlike a B+ tree, both internal nodes and leaves may store actual records.' },
        { label: 'Preemptive split', text: 'A full child is split before insertion descends into it.' },
        { label: 'Balanced height', text: 'Every leaf remains at the same depth, keeping operations logarithmic.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Build', text: 'Enter integer keys, then build the tree.' },
        { label: 'Pause', text: 'Pause at any step to request an AI explanation.' },
        { label: 'Pseudocode', text: 'The highlighted line below follows the current insertion operation.' },
      ],
    },
  ],
}

const ACTION_VARIANTS = {
  init: 'neutral', search: 'info', descend: 'info', insert: 'success',
  split: 'purple', 'root-split': 'purple', duplicate: 'warning', done: 'success',
}

function BTreeView({ nodes = [], highlighted = [] }) {
  if (!nodes.length) return <div className="py-20 text-center text-sm text-db-muted">Empty tree</div>

  const levels = new Map()
  nodes.forEach(node => levels.set(node.level, [...(levels.get(node.level) ?? []), node]))
  const positions = new Map()
  const maxLevel = Math.max(...levels.keys())
  const leafCount = levels.get(maxLevel)?.length ?? 1
  const width = Math.max(680, leafCount * 150)
  const height = (maxLevel + 1) * 130 + 50

  levels.forEach((levelNodes, level) => {
    const spacing = width / (levelNodes.length + 1)
    levelNodes.forEach((node, index) => positions.set(node.id, { x: spacing * (index + 1), y: 25 + level * 130 }))
  })

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} className="mx-auto block">
        {nodes.flatMap(node => node.childIds.map(childId => {
          const from = positions.get(node.id)
          const to = positions.get(childId)
          return from && to ? (
            <line key={`${node.id}-${childId}`} x1={from.x} y1={from.y + 42} x2={to.x} y2={to.y}
              stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />
          ) : null
        }))}

        {nodes.map(node => {
          const position = positions.get(node.id)
          const active = highlighted.includes(node.id)
          const cellWidth = 42
          const nodeWidth = Math.max(48, node.keys.length * cellWidth)
          const stroke = node.isLeaf ? '#22c55e' : '#8b5cf6'
          return (
            <motion.g key={node.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <rect x={position.x - nodeWidth / 2} y={position.y} width={nodeWidth} height="42" rx="8"
                fill={active ? (node.isLeaf ? '#14532d' : '#4c1d95') : '#1e293b'}
                stroke={stroke} strokeWidth={active ? 2.5 : 1.5} />
              {node.keys.map((key, index) => (
                <g key={key}>
                  {index > 0 && <line x1={position.x - nodeWidth / 2 + index * cellWidth} y1={position.y + 5}
                    x2={position.x - nodeWidth / 2 + index * cellWidth} y2={position.y + 37} stroke={stroke} />}
                  <text x={position.x - nodeWidth / 2 + index * cellWidth + cellWidth / 2} y={position.y + 22}
                    textAnchor="middle" dominantBaseline="middle" fill={node.isLeaf ? '#bbf7d0' : '#ddd6fe'}
                    fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">{key}</text>
                </g>
              ))}
              {!node.keys.length && <text x={position.x} y={position.y + 22} textAnchor="middle" dominantBaseline="middle" fill="#64748b">empty</text>}
              <text x={position.x} y={position.y + 58} textAnchor="middle" fill="#64748b" fontSize="10">
                {node.isLeaf ? 'leaf records' : 'internal records'}
              </text>
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}

export default function BTreePage() {
  const [keyInput, setKeyInput] = useState(DEFAULT_KEYS.join(' '))
  const [error, setError] = useState('')

  return (
    <SimulationPlayer
      title="B-tree Simulator"
      subtitle={`Insert and split nodes in a minimum-degree ${MIN_DEGREE} B-tree`}
      accentColor="purple"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs text-db-muted font-mono uppercase tracking-widest">Keys to Insert</label>
            <textarea value={keyInput} rows={4} onChange={event => { setKeyInput(event.target.value); setError('') }}
              className="w-full resize-none rounded-lg border border-db-border bg-db-bg px-3 py-2 font-mono text-sm text-white focus:border-db-purple focus:outline-none" />
            {error && <p className="text-xs text-db-red">{error}</p>}
            <button className="w-full rounded-lg bg-db-purple py-2 text-sm font-medium text-white hover:bg-violet-400"
              onClick={() => {
                const keys = keyInput.trim().split(/[\s,]+/).map(Number)
                if (!keys.length || keys.some(key => !Number.isInteger(key))) { setError('Enter space-separated integers'); return }
                setError('')
                reset(bTreeSteps(keys))
              }}>
              Build B-tree
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="text-db-muted font-mono uppercase tracking-widest">Properties</div>
            <div className="flex justify-between"><span>Maximum keys</span><span className="font-mono text-white">3</span></div>
            <div className="flex justify-between"><span>Maximum children</span><span className="font-mono text-white">4</span></div>
            <div className="flex justify-between"><span>Record storage</span><span className="text-db-purple">all nodes</span></div>
          </div>

          {step && <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Current Action</div>
            <StatusBadge variant={ACTION_VARIANTS[step.action]}>{step.action?.replace('-', ' ')}</StatusBadge>
            {step.key !== null && <div className="text-xs text-slate-400">Key <span className="font-mono text-white">{step.key}</span></div>}
          </div>}
        </div>
      )}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          <div className="min-h-72 rounded-2xl border border-db-border bg-db-card p-5">
            <div className="mb-3 text-xs text-db-muted font-mono uppercase tracking-widest">Tree Structure</div>
            <BTreeView nodes={step?.tree} highlighted={step?.highlightNodeIds} />
          </div>
          <AnimatePresence mode="wait">{step && (
            <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3 rounded-xl border border-db-border bg-db-card p-5">
              <p className="text-sm text-white">{step.explanation}</p>
              <div className="border-t border-db-border pt-3">
                <span className="text-[10px] text-db-purple font-mono uppercase tracking-widest">Why?</span>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.why}</p>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={BTREE_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
