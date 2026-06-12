import { Link } from 'react-router-dom'

export default function ComingSoon({ title, category, color = 'text-db-blue' }) {
  return (
    <div className="min-h-screen bg-db-bg flex flex-col items-center justify-center text-center px-6">
      <div className="text-5xl mb-6 font-mono text-db-muted">[ ]</div>
      <div className={`text-xs font-mono uppercase tracking-widest ${color} mb-3`}>{category}</div>
      <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
      <p className="text-db-muted text-sm max-w-md mb-8">
        This simulation is under construction. The engine and visualization will be added soon.
      </p>
      <Link to="/" className="px-5 py-2 border border-db-border rounded-lg text-slate-400 hover:text-white hover:border-slate-400 text-sm transition-colors">
        ← Back to Home
      </Link>
    </div>
  )
}
