import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import DataTable from '../core/DataTable'
import StatusBadge from '../core/StatusBadge'
import { clusteredIndexSteps, CLUSTERED_CODE } from './engine'

const HELP = {
  title: 'Clustered Index',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Ordered pages', text: 'The table rows are physically ordered by the clustering key.' },
        { label: 'Page splits', text: 'Maintaining order can make inserts more expensive when a page fills up.' },
        { label: 'Range wins', text: 'Range scans can stream adjacent pages in key order.' },
      ],
    },
  ],
}

function LeafStrip({ leafKeys, focusPageId }) {
  return (
    <div className="rounded-xl border border-db-border bg-db-card p-4">
      <div className="mb-3 text-xs font-mono uppercase tracking-widest text-db-muted">Leaf / Data Page Order</div>
      <div className="flex flex-wrap items-center gap-2">
        {leafKeys.map((leaf, index) => (
          <div key={leaf.pageId} className="flex items-center gap-2">
            <div className={`rounded-xl border px-4 py-3 ${focusPageId === leaf.pageId ? 'border-db-green bg-db-green/10' : 'border-db-border bg-db-surface'}`}>
              <div className="text-xs font-bold text-white">{leaf.pageId}</div>
              <div className="mt-1 text-xs font-mono text-slate-300">{leaf.keys.join(' · ')}</div>
            </div>
            {index < leafKeys.length - 1 && <span className="text-db-muted">{'->'}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ClusteredIndexPage() {
  return (
    <SimulationPlayer
      title="Clustered Index"
      subtitle="Watch sorted data pages support expensive inserts but efficient range scans"
      accentColor="green"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button
              onClick={() => reset(clusteredIndexSteps())}
              className="w-full rounded-xl bg-db-green py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-green-300"
            >
              Start Clustered Index Walkthrough
            </button>
          ) : (
            <button
              onClick={() => reset(clusteredIndexSteps())}
              className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Restart
            </button>
          )}

          {step && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Action</div>
                <StatusBadge variant={step.action === 'split' ? 'warning' : step.action === 'done' ? 'success' : 'info'}>
                  {step.action}
                </StatusBadge>
                {step.focusKey !== null && <div className="text-xs text-slate-400">Key <span className="font-mono text-white">{step.focusKey}</span></div>}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Why Clustered</div>
                <p className="text-xs leading-relaxed text-slate-400">
                  The leaf order and the row order are the same structure, so reading a key range is mostly sequential I/O.
                </p>
              </div>
            </>
          )}
        </div>
      )}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          {step ? (
            <>
              <LeafStrip leafKeys={step.leafKeys} focusPageId={step.focusPageId} />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {step.pages.map(page => (
                  <div key={page.id} className={`rounded-xl border p-4 ${step.focusPageId === page.id ? 'border-db-green bg-db-green/5' : 'border-db-border bg-db-card'}`}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{page.id}</span>
                      <span className="text-xs font-mono text-db-muted">{page.keys.join(', ')}</span>
                    </div>
                    <DataTable
                      columns={['orderId', 'customer']}
                      rows={page.rows.map(row => [row.orderId, row.customer])}
                      pkColumns={['orderId']}
                      accentColor="green"
                      highlightRowIds={step.focusKey == null ? [] : page.rows.map((row, index) => row.orderId === step.focusKey ? index : -1).filter(index => index >= 0)}
                    />
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-db-border bg-db-card p-5 space-y-3"
                >
                  <p className="text-sm leading-relaxed text-white">{step.explanation}</p>
                  <div className="border-t border-db-border pt-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-db-green">Why?</span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.why}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {step.rangeResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Range Output</div>
                  <DataTable
                    columns={['orderId', 'customer']}
                    rows={step.rangeResults.map(row => [row.orderId, row.customer])}
                    pkColumns={['orderId']}
                    accentColor="green"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-db-border bg-db-card px-6 py-16 text-center text-sm text-db-muted">
              Start the walkthrough to see how sorted data pages change insert and range-scan behavior.
            </div>
          )}
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={CLUSTERED_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
