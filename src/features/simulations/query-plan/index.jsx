import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import StatusBadge from '../core/StatusBadge'
import { queryPlanSteps, QUERY_PLAN_SQL, QUERY_PLAN_CODE } from './engine'

const HELP = {
  title: 'Query Plan',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Optimizer stages', text: 'Parse, estimate, compare candidates, and choose a physical plan.' },
        { label: 'Costing', text: 'The cheapest valid plan is picked using table statistics and operator estimates.' },
        { label: 'Executor handoff', text: 'The chosen tree is what the executor actually runs.' },
      ],
    },
  ],
}

function SqlCard({ lines }) {
  return (
    <div className="rounded-xl border border-db-border bg-[#020617] overflow-hidden">
      <div className="border-b border-db-border px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-db-muted">query.sql</div>
      <div className="space-y-1 px-4 py-4">
        {lines.map(line => (
          <div key={line} className="text-sm font-mono text-slate-300">{line}</div>
        ))}
      </div>
    </div>
  )
}

function PlanTree({ nodes }) {
  if (!nodes.length) {
    return <div className="rounded-xl border border-dashed border-db-border bg-db-card px-6 py-12 text-center text-sm text-db-muted">No physical plan selected yet.</div>
  }

  return (
    <div className="space-y-3">
      {nodes.map(node => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-db-blue/30 bg-db-blue/5 px-4 py-3"
          style={{ marginLeft: `${node.level * 28}px` }}
        >
          <div className="text-sm font-bold text-white">{node.label}</div>
          <div className="text-xs text-slate-400">{node.detail}</div>
        </motion.div>
      ))}
    </div>
  )
}

export default function QueryPlanPage() {
  return (
    <SimulationPlayer
      title="Query Plan"
      subtitle="See how the optimizer turns SQL into a concrete physical plan"
      accentColor="blue"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button onClick={() => reset(queryPlanSteps())} className="w-full rounded-xl bg-db-blue py-2.5 text-sm font-medium text-white hover:bg-blue-400">
              Start Optimizer Walkthrough
            </button>
          ) : (
            <button onClick={() => reset(queryPlanSteps())} className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 hover:text-white">
              Restart
            </button>
          )}

          {step && (
            <>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Phase</div>
                <StatusBadge variant={step.phase === 'final' ? 'success' : 'info'}>{step.phase}</StatusBadge>
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
          <SqlCard lines={QUERY_PLAN_SQL} />

          {step && (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-db-border bg-db-card p-4 space-y-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Candidate Plans</div>
                  {step.candidates.length === 0 ? (
                    <div className="text-sm text-db-muted">Candidates appear once enumeration begins.</div>
                  ) : (
                    step.candidates.map(candidate => (
                      <div key={candidate.name} className={`rounded-lg border px-3 py-3 ${candidate.active ? 'border-db-blue bg-db-blue/10' : 'border-db-border bg-db-surface'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-white">{candidate.name}</div>
                            <div className="text-xs text-slate-400">{candidate.rows} estimated rows</div>
                          </div>
                          <StatusBadge variant={candidate.badge}>cost {candidate.cost}</StatusBadge>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-xl border border-db-border bg-db-card p-4 space-y-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Chosen Physical Tree</div>
                  <PlanTree nodes={step.planTree} />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-db-border bg-db-card p-5">
                  <p className="text-sm leading-relaxed text-white">{step.explanation}</p>
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      )}
      renderRight={({ step }) => <CodePanel code={QUERY_PLAN_CODE} highlightLine={step?.highlightLine ?? -1} />}
    />
  )
}
