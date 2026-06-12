import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import StatusBadge from '../core/StatusBadge'
import DataTable from '../core/DataTable'
import SimHelp from '../../../components/shared/SimHelp'
import { PIPELINE_SQL, STAGES, sqlPipelineSteps } from './engine'

/**
 * Layout (pipeline is the hero):
 *
 *  ┌── SQL banner ────────────────────────────────────────────┐
 *  │ SELECT customer, SUM(total) AS rev  ...                  │
 *  └──────────────────────────────────────────────────────────┘
 *
 *  [Seq Scan] → [Filter] → [Aggregate] → [Sort] → [Output]
 *    7↓7          7↓4         4↓2          2↓2      2 rows
 *
 *  ────────────── Active Operator Detail ──────────────────────
 *
 *  ────────────── Data Table ───────────────────────────────────
 */

const HELP = {
  title: 'SQL Pipeline',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Pipeline operators', text: 'A SELECT query passes through Seq Scan → Filter → Aggregate → Sort → Output.' },
        { label: 'Row counts', text: 'Each stage shows how many rows enter and how many exit after the operator runs.' },
        { label: 'Data table', text: 'The table below the pipeline shows the rows at the current stage.' },
      ],
    },
    {
      heading: 'How to run',
      items: [
        { label: 'Press Play', text: 'Steps advance through the query execution stages automatically.' },
        { label: 'Row highlights', text: 'Green rows pass; red rows are filtered out; amber rows are being processed.' },
      ],
    },
    {
      heading: 'Key concepts',
      items: [
        { label: 'Volcano model', text: 'Each operator "pulls" rows from the one below it. No operator runs until the next one asks for a row.' },
        { label: 'Selectivity', text: 'Applying the most selective filter early reduces work for all downstream operators.' },
      ],
    },
  ],
}

const STATUS_CLS = {
  pending: { box: 'border-db-border bg-db-surface text-slate-500', arrow: 'text-slate-700' },
  active:  { box: 'border-db-blue  bg-db-blue/10  text-db-blue  ring-1 ring-db-blue/40', arrow: 'text-db-blue' },
  done:    { box: 'border-db-green/40 bg-db-green/5  text-db-green', arrow: 'text-slate-600' },
}

function PipelineDiagram({ stages }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {STAGES.map((meta, i) => {
        const s = stages.find(st => st.id === meta.id) ?? { status: 'pending', rowsIn: 0, rowsOut: 0 }
        const cls = STATUS_CLS[s.status] ?? STATUS_CLS.pending
        const isLast = i === STAGES.length - 1

        return (
          <div key={meta.id} className="flex items-center shrink-0">
            <motion.div
              layout
              className={`rounded-xl border-2 px-4 py-3 text-center min-w-24 transition-all duration-300 ${cls.box}`}
            >
              <div className="text-xs font-bold font-mono">{meta.name}</div>
              {s.status !== 'pending' && (
                <div className="text-[10px] font-mono mt-1 opacity-75">
                  {s.rowsIn} → {s.rowsOut}
                </div>
              )}
              {meta.cost && (
                <div className="text-[10px] mt-0.5 opacity-50">{meta.cost}</div>
              )}
            </motion.div>
            {!isLast && (
              <div className={`mx-1 text-xl font-bold ${cls.arrow} transition-colors duration-300`}>→</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SqlBanner({ sql, highlightLine }) {
  return (
    <div className="bg-[#020617] border border-db-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-db-border flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        </div>
        <span className="text-[10px] font-mono text-slate-600">query.sql</span>
      </div>
      <div className="px-5 py-4 space-y-0.5">
        {sql.map((line, i) => (
          <div key={i}
            className={`text-sm font-mono px-2 py-0.5 rounded transition-colors duration-300
              ${i === highlightLine ? 'bg-db-blue/20 text-db-blue' : 'text-slate-400'}`}>
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveOperatorDetail({ step }) {
  if (!step) return null
  const meta = STAGES.find(s => s.id === step.activeStage)
  const stageData = step.stages.find(s => s.id === step.activeStage)
  if (!meta || !stageData) return null

  const descriptions = {
    scan:      'Reads all rows from the heap file. No predicate evaluation yet.',
    filter:    `Evaluates WHERE status = 'SHIPPED'. Rows not matching are discarded immediately.`,
    aggregate: 'Groups rows by customer and accumulates SUM(total) into each bucket.',
    sort:      'Materializes all rows and sorts by rev DESC using a comparison sort.',
    output:    'Returns the final result set to the client.',
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step.activeStage}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="bg-db-card border border-db-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-white font-bold text-sm">{meta.name}</span>
          {stageData.status !== 'pending' && (
            <>
              <span className="text-xs text-db-muted font-mono">{stageData.rowsIn} in → {stageData.rowsOut} out</span>
              {meta.cost && <StatusBadge variant="warning">{meta.cost}</StatusBadge>}
              <StatusBadge variant={stageData.status === 'done' ? 'success' : 'info'}>{stageData.status}</StatusBadge>
            </>
          )}
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{descriptions[step.activeStage]}</p>
      </motion.div>
    </AnimatePresence>
  )
}

export default function SQLPipelinePage() {
  return (
    <SimulationPlayer
      title="SQL Pipeline"
      subtitle="Watch a SELECT query flow through each execution stage"
      accentColor="blue"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}

      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button onClick={() => reset(sqlPipelineSteps())}
              className="w-full py-2.5 bg-db-blue hover:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors">
              Start Simulation
            </button>
          ) : (
            <button onClick={() => reset([])}
              className="w-full py-2.5 border border-db-border text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-colors">
              Restart
            </button>
          )}

          {/* Stage summary list */}
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Stages</div>
            {STAGES.map(meta => {
              const s = step?.stages?.find(st => st.id === meta.id)
              const isActive = step?.activeStage === meta.id
              return (
                <div key={meta.id} className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all
                  ${isActive ? 'border-db-blue bg-db-blue/10 text-db-blue'
                  : s?.status === 'done' ? 'border-db-green/30 text-db-green bg-db-green/5'
                  : 'border-db-border text-slate-500'}`}>
                  {meta.name}
                  {s?.status !== 'pending' && s && (
                    <span className="ml-2 opacity-60">{s.rowsIn}→{s.rowsOut}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Step explanation */}
          <AnimatePresence mode="wait">
            {step && (
              <motion.div key={step.activeStage + step.explanation.slice(0, 10)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-2">
                <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Why?</div>
                <p className="text-xs text-slate-400 leading-relaxed">{step.why}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      renderCenter={({ step, currentStep }) => (
        <div className="space-y-5">
          {/* SQL query — hero at top */}
          <SqlBanner sql={PIPELINE_SQL} highlightLine={step?.highlightLine ?? -1} />

          {/* Pipeline diagram — main visual */}
          <div className="bg-db-card border border-db-border rounded-2xl px-6 py-5">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-4">Execution Pipeline</div>
            {step ? (
              <PipelineDiagram stages={step.stages} />
            ) : (
              <div className="text-center py-6 text-db-muted text-sm">Press Start to begin</div>
            )}
          </div>

          {/* Active operator detail */}
          {step && <ActiveOperatorDetail step={step} />}

          {/* Explanation */}
          <AnimatePresence mode="wait">
            {step && (
              <motion.div key={currentStep}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-db-card border border-db-border rounded-xl p-5">
                <p className="text-sm text-white leading-relaxed">{step.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data table — evidence at the bottom */}
          {step && (
            <div className="space-y-2">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Rows at This Stage</div>
              <DataTable
                columns={step.tableRows[0] && 'rev' in step.tableRows[0]
                  ? ['customer', 'rev']
                  : ['id', 'customer', 'status', 'total']}
                rows={step.tableRows.map(r =>
                  'rev' in r ? [r.customer, `$${r.rev}`] : [r.id ?? '—', r.customer, r.status, `$${r.total}`]
                )}
                highlightRowIds={step.highlightRowIds}
                accentColor="blue"
                rowMeta={step.rowMeta
                  ? (_, i) => step.rowMeta[i]
                  : null}
              />
            </div>
          )}
        </div>
      )}
    />
  )
}
