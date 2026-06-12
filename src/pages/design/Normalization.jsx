import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../components/shared/SimLayout'
import SimHelp from '../../components/shared/SimHelp'
import { NORMAL_FORMS, NORMAL_FORM_DATA, STEP_EXPLANATIONS } from '../../simulation/normalization'

const FORM_COLOR = {
  Unnormalized: { text: 'text-db-red',    border: 'border-db-red',    bg: 'bg-db-red/10',    badge: 'bg-db-red/15 text-db-red'    },
  '1NF':        { text: 'text-db-amber',  border: 'border-db-amber',  bg: 'bg-db-amber/10',  badge: 'bg-db-amber/15 text-db-amber' },
  '2NF':        { text: 'text-db-blue',   border: 'border-db-blue',   bg: 'bg-db-blue/10',   badge: 'bg-db-blue/15 text-db-blue'   },
  '3NF':        { text: 'text-db-purple', border: 'border-db-purple', bg: 'bg-db-purple/10', badge: 'bg-db-purple/15 text-db-purple'},
  BCNF:         { text: 'text-db-green',  border: 'border-db-green',  bg: 'bg-db-green/10',  badge: 'bg-db-green/15 text-db-green' },
}

const HELP = {
  title: 'Normalization',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Step-by-step decomposition', text: 'Start from an unnormalized Orders table and progressively remove anomalies.' },
        { label: 'Functional dependencies', text: 'Each level shows which FDs exist and which ones violate the normal form.' },
        { label: 'Table view', text: 'Tables update at each level so you see exactly how columns are redistributed.' },
      ],
    },
    {
      heading: 'How to use',
      items: [
        { label: 'Click a normal form', text: 'Select any form on the left to jump to that decomposition level.' },
        { label: 'Read the issues', text: 'The left panel lists remaining violations at each level.' },
        { label: 'FD panel', text: 'Functional dependencies that drive the decomposition are shown below each table set.' },
      ],
    },
    {
      heading: 'Normal form guide',
      items: [
        { label: '1NF', text: 'Atomic values, primary key defined.' },
        { label: '2NF', text: 'No partial dependencies on composite PK.' },
        { label: '3NF', text: 'No transitive dependencies via non-key attributes.' },
        { label: 'BCNF', text: 'Every determinant is a superkey (stricter than 3NF).' },
      ],
    },
  ],
}

function TableView({ table, accentColor }) {
  const acc = FORM_COLOR[accentColor]
  const pkSet = new Set(table.pk ?? [])
  return (
    <div className={`rounded-xl border ${acc.border}/30 overflow-hidden`}>
      <div className={`px-4 py-2 ${acc.bg} flex items-center justify-between`}>
        <span className={`text-sm font-bold font-mono ${acc.text}`}>{table.name}</span>
        {table.pk && (
          <span className="text-[10px] text-slate-500 font-mono">PK: {table.pk.join(', ')}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-db-border">
              {table.columns.map(col => (
                <th key={col} className={`px-3 py-2 text-left font-medium
                  ${pkSet.has(col) ? acc.text : 'text-slate-400'}`}>
                  {col}{pkSet.has(col) ? ' *' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-db-border/50 hover:bg-white/5 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-1.5 ${pkSet.has(table.columns[ci]) ? 'text-white' : 'text-slate-400'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Normalization() {
  const [form, setForm] = useState('Unnormalized')
  const data = NORMAL_FORM_DATA[form]
  const expl = STEP_EXPLANATIONS[form]
  const acc = FORM_COLOR[form]

  const currentIdx = NORMAL_FORMS.indexOf(form)

  return (
    <SimLayout
      title="Normalization"
      subtitle="Decompose a denormalized table from Unnormalized to BCNF"
      accentColor="amber"
      help={<SimHelp title={HELP.title} sections={HELP.sections} />}
      left={
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Normal Form</div>
            {NORMAL_FORMS.map((nf, i) => {
              const c = FORM_COLOR[nf]
              return (
                <button
                  key={nf}
                  onClick={() => setForm(nf)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono border transition-all
                    ${form === nf
                      ? `${c.border} ${c.bg} ${c.text}`
                      : 'border-db-border text-slate-400 hover:text-white hover:border-slate-500'}`}
                >
                  <span className="text-slate-600 mr-2">{i + 1}.</span>
                  {nf}
                </button>
              )
            })}
          </div>

          {/* Progress bar */}
          <div>
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-2">Progress</div>
            <div className="h-1.5 bg-db-border rounded-full overflow-hidden">
              <div
                className="h-full bg-db-amber transition-all duration-500 rounded-full"
                style={{ width: `${(currentIdx / (NORMAL_FORMS.length - 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-db-muted mt-1">
              <span>Unnormalized</span>
              <span>BCNF</span>
            </div>
          </div>

          {/* Violations */}
          {data.issues.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-db-red font-mono uppercase tracking-widest">Remaining Issues</div>
              {data.issues.map((issue, i) => (
                <div key={i} className="text-xs text-db-red bg-db-red/10 border border-db-red/20 rounded-lg px-3 py-2 leading-relaxed">
                  {issue}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-db-green bg-db-green/10 border border-db-green/20 rounded-lg px-3 py-2">
              No violations — fully normalized
            </div>
          )}

          {/* FDs */}
          {data.fds.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-db-muted font-mono uppercase tracking-widest">Functional Dependencies</div>
              {data.fds.map((fd, i) => (
                <div key={i} className={`text-xs font-mono px-3 py-2 rounded-lg border
                  ${fd.includes('transitive') ? 'bg-db-red/10 border-db-red/20 text-db-red' : 'bg-db-bg border-db-border text-slate-400'}`}>
                  {fd}
                </div>
              ))}
            </div>
          )}
        </div>
      }
      center={
        <div className="space-y-4">
          {/* Explanation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={form}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-db-card border border-db-border rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${acc.badge}`}>{form}</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{expl.explanation}</p>
              <div className="border-t border-db-border pt-3">
                <span className="text-[10px] text-db-amber font-mono uppercase tracking-widest">Why?</span>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{expl.why}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Tables */}
          <AnimatePresence mode="wait">
            <motion.div
              key={form + '-tables'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {data.tables.map(table => (
                <TableView key={table.name} table={table} accentColor={form} />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Next step hint */}
          {currentIdx < NORMAL_FORMS.length - 1 && (
            <div className="flex justify-end">
              <button
                onClick={() => setForm(NORMAL_FORMS[currentIdx + 1])}
                className="px-4 py-2 bg-db-amber/10 border border-db-amber/30 text-db-amber rounded-xl text-xs font-mono hover:bg-db-amber/20 transition-colors"
              >
                Next: {NORMAL_FORMS[currentIdx + 1]} →
              </button>
            </div>
          )}
        </div>
      }
    />
  )
}
