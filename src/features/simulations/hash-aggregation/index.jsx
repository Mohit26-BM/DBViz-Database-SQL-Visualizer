import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import DataTable from '../core/DataTable'
import StatusBadge from '../core/StatusBadge'
import { hashAggregationSteps, HASH_AGG_INPUT, HASH_AGG_CODE } from './engine'

const HELP = {
  title: 'Hash Aggregation',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Group buckets', text: 'Each group key gets one hash bucket holding its aggregate state.' },
        { label: 'Streaming updates', text: 'Rows are aggregated as they arrive, without sorting first.' },
        { label: 'Tradeoff', text: 'Great when groups fit in memory; less great when state spills or ordering matters.' },
      ],
    },
  ],
}

function BucketCard({ bucket, active }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${active ? 'border-db-green bg-db-green/10' : 'border-db-border bg-db-card'}`}>
      <div className="text-sm font-bold text-white">{bucket.customer}</div>
      <div className="text-xs text-slate-400">running sum</div>
      <div className="mt-2 text-lg font-mono text-db-green">${bucket.sum}</div>
    </div>
  )
}

export default function HashAggregationPage() {
  return (
    <SimulationPlayer
      title="Hash Aggregation"
      subtitle="Build one aggregate state per group as rows stream through the executor"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button onClick={() => reset(hashAggregationSteps())} className="w-full rounded-xl bg-db-green py-2.5 text-sm font-medium text-slate-950 hover:bg-green-300">
              Start Hash Aggregation
            </button>
          ) : (
            <button onClick={() => reset(hashAggregationSteps())} className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 hover:text-white">
              Restart
            </button>
          )}

          {step && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Phase</div>
                <StatusBadge variant={step.phase === 'done' ? 'success' : step.phase === 'new-group' ? 'warning' : 'info'}>
                  {step.phase}
                </StatusBadge>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Why?</div>
                <p className="text-xs leading-relaxed text-slate-400">{step.why}</p>
              </div>
            </>
          )}
        </div>
      )}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          {step ? (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Input Rows</div>
                <DataTable
                  columns={['customer', 'total']}
                  rows={HASH_AGG_INPUT.map(row => [row.customer, `$${row.total}`])}
                  accentColor="green"
                  highlightRowIds={step.currentRowIndex >= 0 ? [step.currentRowIndex] : []}
                />
              </div>

              <div className="rounded-xl border border-db-border bg-db-card p-4">
                <div className="mb-3 text-xs font-mono uppercase tracking-widest text-db-muted">Hash Buckets</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {step.buckets.length === 0 ? (
                    <div className="text-sm text-db-muted">No groups yet.</div>
                  ) : (
                    step.buckets.map(bucket => (
                      <BucketCard
                        key={bucket.customer}
                        bucket={bucket}
                        active={step.currentRowIndex >= 0 && HASH_AGG_INPUT[step.currentRowIndex].customer === bucket.customer}
                      />
                    ))
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-db-border bg-db-card p-5">
                  <p className="text-sm leading-relaxed text-white">{step.explanation}</p>
                </motion.div>
              </AnimatePresence>

              {step.output.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Aggregated Output</div>
                  <DataTable
                    columns={['customer', 'sum(total)']}
                    rows={step.output.map(row => [row.customer, `$${row.sum}`])}
                    accentColor="green"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-db-border bg-db-card px-6 py-16 text-center text-sm text-db-muted">
              Start the walkthrough to see groups appear and accumulate in memory.
            </div>
          )}
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={HASH_AGG_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
