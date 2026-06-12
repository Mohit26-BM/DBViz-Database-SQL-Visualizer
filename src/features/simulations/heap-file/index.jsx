import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import StatusBadge from '../core/StatusBadge'
import { heapFileSteps, HEAP_CODE } from './engine'

const HELP = {
  title: 'Heap File',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Unordered pages', text: 'Records are stored in whichever page has room, not in key order.' },
        { label: 'Free-space map', text: 'Insertion uses metadata to find reusable capacity quickly.' },
        { label: 'Cheap writes', text: 'Searches are slower, but inserts and deletes are simple.' },
      ],
    },
  ],
}

function PageCard({ page, highlightSlot, active }) {
  return (
    <div className={`rounded-xl border p-4 ${active ? 'border-db-amber bg-db-amber/5' : 'border-db-border bg-db-card'}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-white">{page.id}</span>
        <span className="text-xs font-mono text-db-muted">{page.slots.filter(slot => slot?.status === 'live').length}/{page.capacity} used</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {page.slots.map((slot, index) => (
          <div
            key={`${page.id}-${index}`}
            className={`rounded-lg border px-3 py-3 text-center text-xs font-mono ${
              highlightSlot === index ? 'border-db-amber bg-db-amber/10 text-db-amber'
              : !slot ? 'border-db-border bg-db-surface text-db-muted'
              : slot.status === 'deleted' ? 'border-db-red/30 bg-db-red/10 text-db-red'
              : 'border-db-blue/30 bg-db-blue/5 text-slate-200'
            }`}
          >
            {slot ? `${slot.key}` : 'free'}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HeapFilePage() {
  return (
    <SimulationPlayer
      title="Heap File"
      subtitle="Follow inserts, lookups, deletes, and space reuse inside unordered pages"
      accentColor="amber"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button
              onClick={() => reset(heapFileSteps())}
              className="w-full rounded-xl bg-db-amber py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-amber-300"
            >
              Start Heap File Walkthrough
            </button>
          ) : (
            <button
              onClick={() => reset(heapFileSteps())}
              className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Restart
            </button>
          )}

          {step && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Action</div>
                <StatusBadge variant={step.action === 'delete' ? 'error' : step.action === 'reuse' ? 'success' : 'warning'}>
                  {step.action}
                </StatusBadge>
                {step.targetKey !== null && <div className="text-xs text-slate-400">Key <span className="font-mono text-white">{step.targetKey}</span></div>}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Free-Space Map</div>
                {step.fsm.map(entry => (
                  <div key={entry.pageId} className="flex justify-between rounded-lg border border-db-border bg-db-surface px-3 py-2 text-xs">
                    <span className="text-slate-400">{entry.pageId}</span>
                    <span className="font-mono text-white">{entry.freeSlots} free</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          {step ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {step.pages.map(page => (
                  <PageCard
                    key={page.id}
                    page={page}
                    highlightSlot={step.highlightPageId === page.id ? step.highlightSlot : null}
                    active={step.highlightPageId === page.id}
                  />
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
                    <span className="text-[10px] font-mono uppercase tracking-widest text-db-amber">Why?</span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.why}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="rounded-2xl border border-db-border bg-db-card px-6 py-16 text-center text-sm text-db-muted">
              Start the walkthrough to see how heap pages absorb writes and pay for unordered reads.
            </div>
          )}
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={HEAP_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
