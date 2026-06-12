/**
 * Reusable data table for showing database rows during simulations.
 *
 * Props:
 *   columns         string[]       — header labels
 *   rows            any[][]        — array of row value arrays
 *   highlightRowIds number[]       — row indexes to highlight (0-based)
 *   pkColumns       string[]       — column names that form the PK (bold + accent)
 *   accentColor     'blue'|'green'|'purple'|'amber'|'red'
 *   rowMeta         (row, i) => { badge?: string, variant?: string }
 *                                  — optional per-row label in last column
 */

const ACCENT_TEXT = {
  blue:   'text-db-blue',
  green:  'text-db-green',
  purple: 'text-db-purple',
  amber:  'text-db-amber',
  red:    'text-db-red',
}

const HIGHLIGHT_ROW = {
  blue:   'bg-db-blue/10   border-l-2 border-db-blue',
  green:  'bg-db-green/10  border-l-2 border-db-green',
  purple: 'bg-db-purple/10 border-l-2 border-db-purple',
  amber:  'bg-db-amber/10  border-l-2 border-db-amber',
  red:    'bg-db-red/10    border-l-2 border-db-red',
}

const BADGE_VARIANT = {
  pass:    'text-db-green  bg-db-green/10  border-db-green/30',
  fail:    'text-db-red    bg-db-red/10    border-db-red/30',
  active:  'text-db-blue   bg-db-blue/10   border-db-blue/30',
  neutral: 'text-slate-400 bg-db-surface   border-db-border',
}

export default function DataTable({
  columns = [],
  rows = [],
  highlightRowIds = [],
  pkColumns = [],
  accentColor = 'blue',
  rowMeta = null,
}) {
  const pkSet = new Set(pkColumns)
  const accent = ACCENT_TEXT[accentColor] ?? ACCENT_TEXT.blue
  const highlightSet = new Set(highlightRowIds)
  const highlightCls = HIGHLIGHT_ROW[accentColor] ?? HIGHLIGHT_ROW.blue

  return (
    <div className="rounded-xl border border-db-border overflow-hidden">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-db-border bg-db-surface">
            {columns.map(col => (
              <th key={col} className={`px-3 py-2 text-left font-medium ${pkSet.has(col) ? accent : 'text-slate-400'}`}>
                {col}{pkSet.has(col) ? ' *' : ''}
              </th>
            ))}
            {rowMeta && <th className="px-3 py-2 text-left text-slate-500">status</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isHighlighted = highlightSet.has(ri)
            const meta = rowMeta?.(row, ri)
            const badgeCls = BADGE_VARIANT[meta?.variant] ?? BADGE_VARIANT.neutral
            return (
              <tr
                key={ri}
                className={`border-b border-db-border/50 transition-colors ${isHighlighted ? highlightCls : 'hover:bg-white/5'}`}
              >
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-1.5 ${pkSet.has(columns[ci]) ? 'text-white font-bold' : 'text-slate-400'}`}>
                    {cell}
                  </td>
                ))}
                {rowMeta && meta && (
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono ${badgeCls}`}>
                      {meta.badge}
                    </span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
