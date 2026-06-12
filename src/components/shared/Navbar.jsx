import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const GROUPS = [
  {
    label: 'Data Structures',
    color: 'text-db-purple',
    items: [
      { label: 'B+ Tree',     path: '/data-structures/bplustree', badge: 'Core' },
      { label: 'B Tree',      path: '/data-structures/btree' },
      { label: 'Hash Index',  path: '/data-structures/hash-index' },
    ],
  },
  {
    label: 'Query Processing',
    color: 'text-db-blue',
    items: [
      { label: 'SQL Pipeline',      path: '/query-processing/sql-pipeline', badge: 'New' },
      { label: 'Join Algorithms',   path: '/query-processing/joins', badge: 'Popular' },
      { label: 'Query Plan',        path: '/query-processing/query-plan' },
    ],
  },
  {
    label: 'Storage',
    color: 'text-db-amber',
    items: [
      { label: 'Table Scan vs Index Scan', path: '/storage/scan-comparison' },
      { label: 'Heap File',                path: '/storage/heap-file' },
      { label: 'Clustered Index',          path: '/storage/clustered-index' },
    ],
  },
  {
    label: 'Transactions',
    color: 'text-db-green',
    items: [
      { label: 'Isolation Levels', path: '/transactions/isolation-levels', badge: 'Core' },
      { label: 'MVCC',             path: '/transactions/mvcc' },
      { label: 'Deadlocks',        path: '/transactions/deadlocks' },
      { label: 'ACID',             path: '/transactions/acid' },
    ],
  },
  {
    label: 'Design & Algorithms',
    color: 'text-db-amber',
    items: [
      { label: 'Normalization',    path: '/design/normalization' },
      { label: 'External Sort',    path: '/algorithms/external-sort' },
      { label: 'Hash Aggregation', path: '/algorithms/hash-aggregation' },
    ],
  },
]

function DropdownGroup({ group }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const isActive = group.items.some(i => location.pathname.startsWith(i.path))

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-sm font-medium px-1 py-1 rounded transition-colors whitespace-nowrap
          ${isActive ? `${group.color}` : 'text-slate-400 hover:text-white'}`}
      >
        {group.label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-52 bg-db-card border border-db-border rounded-xl shadow-2xl shadow-black/50 py-1.5 z-50">
          <div className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest ${group.color} border-b border-db-border mb-1`}>
            {group.label}
          </div>
          {group.items.map(({ label, path, badge }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-sm transition-colors
                 ${isActive ? 'text-white bg-white/5 font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
              }
            >
              {label}
              {badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono
                  ${badge === 'Core' ? 'bg-db-blue/20 text-db-blue' :
                    badge === 'Popular' ? 'bg-db-purple/20 text-db-purple' :
                    'bg-db-green/20 text-db-green'}`}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-db-card border-b border-db-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-3 max-w-screen-2xl mx-auto">
        <NavLink to="/" className="font-bold text-lg tracking-tight shrink-0 text-white">
          DB<span className="text-db-blue">Viz</span>
        </NavLink>

        <div className="hidden lg:flex items-center gap-5">
          {GROUPS.map(g => <DropdownGroup key={g.label} group={g} />)}
        </div>

        <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden text-slate-400 hover:text-white p-1">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-db-border bg-db-card px-6 py-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {GROUPS.map(g => (
            <div key={g.label}>
              <div className={`text-[10px] font-mono uppercase tracking-widest ${g.color} mb-2`}>{g.label}</div>
              <div className="space-y-1 pl-2">
                {g.items.map(({ label, path }) => (
                  <NavLink key={path} to={path} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `block text-sm py-1 ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
