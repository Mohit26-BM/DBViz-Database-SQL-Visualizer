import { motion, AnimatePresence } from 'framer-motion'
import SimulationPlayer from '../core/SimulationPlayer'
import SimHelp from '../../../components/shared/SimHelp'
import CodePanel from '../../../components/shared/CodePanel'
import DataTable from '../core/DataTable'
import StatusBadge from '../core/StatusBadge'
import { scanComparisonSteps, TABLE_ROWS, INDEX_ENTRIES, SCAN_CODE } from './engine'

const HELP = {
  title: 'Table Scan vs Index Scan',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Table scan', text: 'Reads every heap tuple and evaluates the predicate row by row.' },
        { label: 'Index scan', text: 'Seeks into the matching key range, then fetches only qualifying rows.' },
        { label: 'Same answer', text: 'Both access paths return the same rows, but with different read costs.' },
      ],
    },
    {
      heading: 'When it matters',
      items: [
        { label: 'Selective predicates', text: 'Indexes shine when a small fraction of rows qualifies.' },
        { label: 'Large result sets', text: 'Sequential scans often win once many rows must be fetched anyway.' },
      ],
    },
  ],
}

function ScanCard({ title, color, border, bg, scan, rows, activeField = 'id', mode = 'table' }) {
  const resultSet = new Set(scan.resultIds)
  const visitedSet = mode === 'table' ? new Set(scan.visitedRowIds) : new Set(scan.visitedSalaries)

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${color}`}>{title}</span>
        <div className="flex gap-2">
          <StatusBadge variant={scan.status === 'done' ? 'success' : scan.status === 'active' ? 'info' : 'neutral'}>
            {scan.status}
          </StatusBadge>
          <span className="text-xs font-mono text-db-muted">{scan.reads} reads</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-300">{scan.explanation}</p>

      <div className="space-y-2">
        {rows.map(row => {
          const key = row[activeField]
          const isCurrent = mode === 'table' ? scan.currentRowId === key : scan.currentSalary === key
          const isVisited = visitedSet.has(key)
          const isResult = resultSet.has(row.id ?? row.rowId)
          return (
            <div key={key} className={`rounded-lg border px-3 py-2 text-xs font-mono transition-colors ${
              isCurrent ? 'border-db-amber bg-db-amber/10 text-db-amber'
              : isResult ? 'border-db-green/30 bg-db-green/5 text-db-green'
              : isVisited ? 'border-db-blue/30 bg-db-blue/5 text-slate-200'
              : 'border-db-border bg-db-card text-slate-500'
            }`}>
              {mode === 'table'
                ? `${row.id} ${row.name} · ${row.dept} · $${row.salary}`
                : `${row.salary} -> row ${row.rowId}`}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScanComparisonPage() {
  return (
    <SimulationPlayer
      title="Table Scan vs Index Scan"
      subtitle="Compare sequential heap access with a selective secondary-index lookup"
      accentColor="amber"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      renderLeft={({ step, reset }) => (
        <div className="space-y-5">
          {!step ? (
            <button
              onClick={() => reset(scanComparisonSteps())}
              className="w-full rounded-xl bg-db-amber py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-amber-300"
            >
              Start Comparison
            </button>
          ) : (
            <button
              onClick={() => reset(scanComparisonSteps())}
              className="w-full rounded-xl border border-db-border py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Restart
            </button>
          )}

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Predicate</div>
            <div className="rounded-lg border border-db-amber/30 bg-db-amber/10 px-3 py-2 text-sm font-mono text-db-amber">
              salary &gt;= 90000
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Selectivity</div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Qualifying rows</span>
              <span className="font-mono text-white">4 / {TABLE_ROWS.length}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Index entries visited</span>
              <span className="font-mono text-white">{INDEX_ENTRIES.length}</span>
            </div>
          </div>

          {step && (
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Current Phase</div>
              <StatusBadge variant={step.phase === 'done' ? 'success' : step.phase === 'seek' ? 'warning' : 'info'}>
                {step.phase}
              </StatusBadge>
              <p className="text-xs leading-relaxed text-slate-400">{step.why}</p>
            </div>
          )}
        </div>
      )}
      renderCenter={({ step, currentStep }) => (
        <div className="space-y-4">
          {step ? (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ScanCard
                  title="Heap Table Scan"
                  color="text-db-blue"
                  border="border-db-blue/30"
                  bg="bg-db-blue/5"
                  scan={step.tableScan}
                  rows={TABLE_ROWS}
                  mode="table"
                />
                <ScanCard
                  title="Secondary Index Scan"
                  color="text-db-green"
                  border="border-db-green/30"
                  bg="bg-db-green/5"
                  scan={step.indexScan}
                  rows={INDEX_ENTRIES}
                  activeField="salary"
                  mode="index"
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-db-border bg-db-card p-5"
                >
                  <p className="text-sm leading-relaxed text-white">{step.explanation}</p>
                </motion.div>
              </AnimatePresence>

              {step.phase === 'done' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-db-blue/30 bg-db-blue/5 p-4">
                    <div className="mb-2 text-sm font-bold text-db-blue">Table Scan Summary</div>
                    <div className="text-xs text-slate-300">Reads all {TABLE_ROWS.length} heap rows to produce 4 results.</div>
                    <div className="mt-2 text-xs font-mono text-db-muted">{step.tableScan.reads} row reads</div>
                  </div>
                  <div className="rounded-xl border border-db-green/30 bg-db-green/5 p-4">
                    <div className="mb-2 text-sm font-bold text-db-green">Index Scan Summary</div>
                    <div className="text-xs text-slate-300">Seeks into the qualifying key range and fetches only matching tuples.</div>
                    <div className="mt-2 text-xs font-mono text-db-muted">{step.indexScan.reads} index + heap reads</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-db-muted">Returned Rows</div>
                <DataTable
                  columns={['id', 'name', 'dept', 'salary']}
                  rows={TABLE_ROWS.filter(row => step.tableScan.resultIds.includes(row.id)).map(row => [row.id, row.name, row.dept, `$${row.salary}`])}
                  pkColumns={['id']}
                  accentColor="amber"
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-db-border bg-db-card px-6 py-16 text-center text-sm text-db-muted">
              Start the simulation to compare the two access paths.
            </div>
          )}
        </div>
      )}
      renderRight={({ step }) => (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CodePanel code={SCAN_CODE.table} highlightLine={step?.tableScan.highlightLine ?? -1} />
          <CodePanel code={SCAN_CODE.index} highlightLine={step?.indexScan.highlightLine ?? -1} />
        </div>
      )}
    />
  )
}
