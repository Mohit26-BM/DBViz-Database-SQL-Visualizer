import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import StatusBadge from '../core/StatusBadge'
import { externalSortSteps, EXTERNAL_SORT_INPUT, EXTERNAL_SORT_CODE } from './engine'

const HELP = {
  title: 'External Sort',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Run generation', text: 'Chunks are sorted in memory and written out as sorted runs.' },
        { label: 'Merge passes', text: 'Runs are merged until only one globally sorted run remains.' },
        { label: 'Why external', text: 'This is how databases sort data larger than available RAM.' },
      ],
    },
  ],
}

function Tape({ title, values, accent = 'border-db-border bg-db-card text-slate-300' }) {
  return (
    <div className={`rounded-xl border p-4 ${accent}`}>
      <div className="mb-3 text-xs font-mono uppercase tracking-widest text-db-muted">{title}</div>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-sm text-db-muted">empty</span>
        ) : (
          values.map((value, index) => (
            <div key={`${title}-${index}-${value}`} className="rounded-lg border border-db-border bg-db-surface px-3 py-2 text-xs font-mono">
              {value}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function ExternalSortPage() {
  return (
    <SimulationPlayer
      title="External Sort"
      subtitle="Generate sorted runs in memory, then merge them into one sorted file"
      accentColor="purple"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button onClick={() => reset(externalSortSteps())} className="w-full rounded-xl bg-db-purple py-2.5 text-sm font-medium text-white hover:bg-violet-400">
              Start External Sort
            </button>
          ) : (
            <button onClick={() => reset(externalSortSteps())} className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 hover:text-white">
              Restart
            </button>
          )}

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Input</div>
            <div className="rounded-lg border border-db-border bg-db-surface px-3 py-2 text-xs font-mono text-slate-300">
              {EXTERNAL_SORT_INPUT.join(', ')}
            </div>
          </div>

          {step && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Phase</div>
                <StatusBadge variant={step.phase === 'done' ? 'success' : step.phase.includes('merge') ? 'info' : 'purple'}>
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
              <Tape title="Input File" values={step.input} accent="border-db-border bg-db-card text-slate-300" />
              <Tape title="Memory Buffer" values={step.memory} accent="border-db-purple/30 bg-db-purple/5 text-slate-200" />
              <div className="rounded-xl border border-db-border bg-db-card p-4">
                <div className="mb-3 text-xs font-mono uppercase tracking-widest text-db-muted">Runs on Disk</div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {step.runs.length === 0 ? (
                    <div className="text-sm text-db-muted">No runs written yet.</div>
                  ) : (
                    step.runs.map((run, index) => (
                      <Tape key={`run-${index}`} title={`Run ${index + 1}`} values={run} accent="border-db-blue/30 bg-db-blue/5 text-slate-200" />
                    ))
                  )}
                </div>
              </div>
              <Tape title="Merged Output" values={step.output} accent="border-db-green/30 bg-db-green/5 text-slate-200" />

              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-db-border bg-db-card p-5">
                  <p className="text-sm leading-relaxed text-white">{step.explanation}</p>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="rounded-2xl border border-db-border bg-db-card px-6 py-16 text-center text-sm text-db-muted">
              Start the walkthrough to watch the sort spill to disk and merge back together.
            </div>
          )}
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={EXTERNAL_SORT_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
