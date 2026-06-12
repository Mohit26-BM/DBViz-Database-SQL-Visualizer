import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import StatusBadge from '../core/StatusBadge'
import { hashIndexSteps, HASH_INDEX_CODE, BUCKET_COUNT } from './engine'

const DEFAULT_KEYS = [18, 41, 22, 44, 59, 32, 31]

const HELP = {
  title: 'Hash Index Simulator',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Hash function', text: 'Each integer key maps to key mod bucket count.' },
        { label: 'Collisions', text: 'Entries sharing a bucket are retained in a separate chain.' },
        { label: 'Equality lookup', text: 'A lookup jumps to one bucket, then verifies keys in its chain.' },
      ],
    },
    {
      heading: 'Tradeoffs',
      items: [
        { label: 'Fast equality', text: 'Well-distributed buckets provide expected O(1) lookup.' },
        { label: 'No ordering', text: 'Hash indexes do not efficiently support ranges or ORDER BY.' },
        { label: 'Load factor', text: 'Long chains indicate that the index may need more buckets.' },
      ],
    },
  ],
}

const ACTION_VARIANTS = {
  init: 'neutral', hash: 'info', collision: 'warning', insert: 'success',
  'lookup-hash': 'info', probe: 'warning', found: 'success', 'not-found': 'error', done: 'success',
}

function HashBuckets({ buckets = [], activeBucket, activeChain }) {
  return (
    <div className="space-y-2">
      {buckets.map((chain, bucketIndex) => {
        const active = bucketIndex === activeBucket
        return (
          <motion.div key={bucketIndex} layout className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 transition-colors ${active ? 'border-db-amber bg-db-amber/5' : 'border-db-border bg-db-surface/40'}`}>
            <div className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold ${active ? 'border-db-amber text-db-amber' : 'border-db-border text-db-muted'}`}>
              [{bucketIndex}]
            </div>
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-1">
              {!chain.length && <span className="text-xs italic text-db-muted">empty</span>}
              {chain.map((entry, chainIndex) => (
                <div key={`${entry.key}-${entry.rowId}`} className="flex shrink-0 items-center gap-2">
                  {chainIndex > 0 && <span className="text-db-muted">-&gt;</span>}
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-lg border px-3 py-2 font-mono text-xs ${active && chainIndex === activeChain ? 'border-db-green bg-db-green/10 text-db-green' : 'border-db-purple/40 bg-db-purple/5 text-violet-200'}`}>
                    <span className="font-bold">{entry.key}</span>
                    <span className="mx-1 text-db-muted">-&gt;</span>
                    {entry.rowId}
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function HashIndexPage() {
  const [keyInput, setKeyInput] = useState(DEFAULT_KEYS.join(' '))
  const [lookupInput, setLookupInput] = useState('44')
  const [error, setError] = useState('')

  return (
    <SimulationPlayer
      title="Hash Index Simulator"
      subtitle={`Separate chaining across ${BUCKET_COUNT} buckets`}
      accentColor="amber"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => {
        const entryCount = step?.buckets?.reduce((sum, chain) => sum + chain.length, 0) ?? 0
        const collisions = step?.buckets?.reduce((sum, chain) => sum + Math.max(0, chain.length - 1), 0) ?? 0
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-db-muted font-mono uppercase tracking-widest">Index Keys</label>
              <textarea value={keyInput} rows={3} onChange={event => { setKeyInput(event.target.value); setError('') }}
                className="w-full resize-none rounded-lg border border-db-border bg-db-bg px-3 py-2 font-mono text-sm text-white focus:border-db-amber focus:outline-none" />
              <label className="block text-xs text-db-muted font-mono uppercase tracking-widest">Lookup Key</label>
              <input value={lookupInput} onChange={event => { setLookupInput(event.target.value); setError('') }}
                className="w-full rounded-lg border border-db-border bg-db-bg px-3 py-2 font-mono text-sm text-white focus:border-db-amber focus:outline-none" />
              {error && <p className="text-xs text-db-red">{error}</p>}
              <button className="w-full rounded-lg bg-db-amber py-2 text-sm font-medium text-slate-950 hover:bg-amber-300"
                onClick={() => {
                  const keys = keyInput.trim().split(/[\s,]+/).map(Number)
                  const lookup = Number(lookupInput)
                  if (!keys.length || keys.some(key => !Number.isInteger(key)) || !Number.isInteger(lookup)) {
                    setError('Keys and lookup must be integers')
                    return
                  }
                  setError('')
                  reset(hashIndexSteps(keys, lookup))
                }}>
                Build and Lookup
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="text-db-muted font-mono uppercase tracking-widest">Index Metrics</div>
              <div className="flex justify-between"><span>Entries</span><span className="font-mono text-white">{entryCount}</span></div>
              <div className="flex justify-between"><span>Collisions</span><span className="font-mono text-db-amber">{collisions}</span></div>
              <div className="flex justify-between"><span>Load factor</span><span className="font-mono text-white">{(entryCount / BUCKET_COUNT).toFixed(2)}</span></div>
            </div>

            {step && <div className="space-y-2">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Current Action</div>
              <StatusBadge variant={ACTION_VARIANTS[step.action]}>{step.action?.replace('-', ' ')}</StatusBadge>
              {step.key !== null && <div className="text-xs text-slate-400">Key <span className="font-mono text-white">{step.key}</span></div>}
              {step.result && <div className="rounded-lg border border-db-green/30 bg-db-green/10 p-2 text-xs text-db-green">Result pointer: {step.result.rowId}</div>}
            </div>}
          </div>
        )
      }}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-db-border bg-db-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Bucket Directory</div>
              <div className="text-xs text-db-muted font-mono">h(k) = k mod {BUCKET_COUNT}</div>
            </div>
            <HashBuckets buckets={step?.buckets ?? Array.from({ length: BUCKET_COUNT }, () => [])}
              activeBucket={step?.bucketIndex} activeChain={step?.chainIndex} />
          </div>
          <AnimatePresence mode="wait">{step && (
            <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3 rounded-xl border border-db-border bg-db-card p-5">
              <p className="text-sm text-white">{step.explanation}</p>
              <div className="border-t border-db-border pt-3">
                <span className="text-[10px] text-db-amber font-mono uppercase tracking-widest">Why?</span>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.why}</p>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={HASH_INDEX_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
