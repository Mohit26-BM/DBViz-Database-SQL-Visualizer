import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SimLayout from '../../../components/shared/SimLayout'
import SimHelp from '../../../components/shared/SimHelp'
import DataTable from '../core/DataTable'
import { NORMAL_FORMS, NORMAL_FORM_DATA, STEP_EXPLANATIONS } from './engine'

// Normalization is navigation-based (no player) so uses SimLayout directly
const FORM_COLOR = {
  Unnormalized: { text: 'text-db-red',    border: 'border-db-red',    bg: 'bg-db-red/10',    badge: 'bg-db-red/15    text-db-red'    },
  '1NF':        { text: 'text-db-amber',  border: 'border-db-amber',  bg: 'bg-db-amber/10',  badge: 'bg-db-amber/15  text-db-amber'  },
  '2NF':        { text: 'text-db-blue',   border: 'border-db-blue',   bg: 'bg-db-blue/10',   badge: 'bg-db-blue/15   text-db-blue'   },
  '3NF':        { text: 'text-db-purple', border: 'border-db-purple', bg: 'bg-db-purple/10', badge: 'bg-db-purple/15 text-db-purple' },
  BCNF:         { text: 'text-db-green',  border: 'border-db-green',  bg: 'bg-db-green/10',  badge: 'bg-db-green/15  text-db-green'  },
}

const HELP = {
  title: 'Normalization',
  sections: [
    {
      heading: 'What this shows',
      items: [
        { label: 'Step-by-step decomposition', text: 'Start from an unnormalized Orders table and progressively remove anomalies.' },
        { label: 'Functional dependencies', text: 'Each level shows which FDs exist and which violate the normal form.' },
      ],
    },
    {
      heading: 'How to use',
      items: [
        { label: 'Click a normal form', text: 'Select any level on the left to jump to that decomposition.' },
        { label: 'Issues panel', text: 'Lists remaining violations at each level.' },
        { label: 'Next button', text: 'Advances to the next normal form.' },
      ],
    },
    {
      heading: 'Normal form guide',
      items: [
        { label: '1NF', text: 'Atomic values, primary key defined.' },
        { label: '2NF', text: 'No partial dependencies on composite PK.' },
        { label: '3NF', text: 'No transitive dependencies via non-key attributes.' },
        { label: 'BCNF', text: 'Every determinant is a superkey.' },
      ],
    },
  ],
}

export default function NormalizationPage() {
  const [form, setForm] = useState('Unnormalized')
  const data = NORMAL_FORM_DATA[form]
  const expl = STEP_EXPLANATIONS[form]
  const acc  = FORM_COLOR[form]
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
                <button key={nf} onClick={() => setForm(nf)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono border transition-all
                    ${form === nf ? `${c.border} ${c.bg} ${c.text}` : 'border-db-border text-slate-400 hover:text-white hover:border-slate-500'}`}>
                  <span className="text-slate-600 mr-2">{i + 1}.</span>{nf}
                </button>
              )
            })}
          </div>

          <div>
            <div className="text-xs text-db-muted font-mono uppercase tracking-widest mb-2">Progress</div>
            <div className="h-1.5 bg-db-border rounded-full overflow-hidden">
              <div className="h-full bg-db-amber transition-all duration-500 rounded-full"
                style={{ width: `${(currentIdx / (NORMAL_FORMS.length - 1)) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-db-muted mt-1">
              <span>Unnormalized</span><span>BCNF</span>
            </div>
          </div>

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
          <AnimatePresence mode="wait">
            <motion.div key={form}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-db-card border border-db-border rounded-xl p-5 space-y-3">
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${acc.badge}`}>{form}</span>
              <p className="text-sm text-white leading-relaxed">{expl.explanation}</p>
              <div className="border-t border-db-border pt-3">
                <span className="text-[10px] text-db-amber font-mono uppercase tracking-widest">Why?</span>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{expl.why}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={form + '-tables'}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              {data.tables.map(table => (
                <div key={table.name}>
                  <div className={`text-xs font-mono font-bold ${acc.text} mb-2`}>{table.name}</div>
                  <DataTable
                    columns={table.columns}
                    rows={table.rows}
                    pkColumns={table.pk ?? []}
                    accentColor="amber"
                  />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {currentIdx < NORMAL_FORMS.length - 1 && (
            <div className="flex justify-end">
              <button onClick={() => setForm(NORMAL_FORMS[currentIdx + 1])}
                className="px-4 py-2 bg-db-amber/10 border border-db-amber/30 text-db-amber rounded-xl text-xs font-mono hover:bg-db-amber/20 transition-colors">
                Next: {NORMAL_FORMS[currentIdx + 1]} →
              </button>
            </div>
          )}
        </div>
      }
    />
  )
}
