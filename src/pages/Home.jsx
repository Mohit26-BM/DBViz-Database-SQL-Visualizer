import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

// ── Hero Canvas — live B+ Tree insert animation ──────────────────────────────
function HeroBTree() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight

    // Simple B+ tree states to cycle through
    const STATES = [
      { nodes: [{ keys: ['30'], y: 60, x: W / 2 }], leaves: [
        { keys: ['10', '20'], x: W/2 - 160, y: 160 },
        { keys: ['30', '40'], x: W/2 + 40,  y: 160 },
      ]},
      { nodes: [{ keys: ['30'], y: 60, x: W / 2 }], leaves: [
        { keys: ['10', '20'], x: W/2 - 160, y: 160 },
        { keys: ['30', '40', '50'], x: W/2 + 40, y: 160 },
      ]},
      { nodes: [{ keys: ['30', '50'], y: 60, x: W / 2 }], leaves: [
        { keys: ['10', '20'],  x: W/2 - 200, y: 160 },
        { keys: ['30', '40'],  x: W/2 - 20,  y: 160 },
        { keys: ['50', '60'],  x: W/2 + 160, y: 160 },
      ]},
      { nodes: [{ keys: ['30', '50'], y: 60, x: W / 2 }], leaves: [
        { keys: ['10', '20'],       x: W/2 - 220, y: 160 },
        { keys: ['30', '40'],       x: W/2 - 50,  y: 160 },
        { keys: ['50', '60', '70'], x: W/2 + 130, y: 160 },
      ]},
    ]

    let stateIdx = 0
    let t = 0
    let animId

    function lerp(a, b, f) { return a + (b - a) * f }

    function drawNode(ctx, node, alpha, highlight = false) {
      const BOX_W = 48 * node.keys.length
      const BOX_H = 36
      const x = node.x - BOX_W / 2
      const y = node.y

      ctx.globalAlpha = alpha
      // Node box
      ctx.fillStyle = highlight ? '#1d4ed8' : '#1e3a5f'
      ctx.strokeStyle = highlight ? '#60a5fa' : '#3b82f6'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x, y, BOX_W, BOX_H, 8)
      ctx.fill()
      ctx.stroke()

      // Keys
      node.keys.forEach((k, i) => {
        if (i > 0) {
          ctx.strokeStyle = '#3b82f6'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + 48 * i, y + 6)
          ctx.lineTo(x + 48 * i, y + BOX_H - 6)
          ctx.stroke()
        }
        ctx.fillStyle = '#e2e8f0'
        ctx.font = 'bold 14px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(k, x + 48 * i + 24, y + BOX_H / 2)
      })
      ctx.globalAlpha = 1
    }

    function drawLeaf(ctx, leaf, alpha, highlight = false) {
      const BOX_W = 48 * leaf.keys.length
      const BOX_H = 34
      const x = leaf.x - BOX_W / 2
      const y = leaf.y

      ctx.globalAlpha = alpha
      ctx.fillStyle = highlight ? '#14532d' : '#0f2d1d'
      ctx.strokeStyle = highlight ? '#4ade80' : '#22c55e'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x, y, BOX_W, BOX_H, 8)
      ctx.fill()
      ctx.stroke()

      leaf.keys.forEach((k, i) => {
        if (i > 0) {
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + 48 * i, y + 6)
          ctx.lineTo(x + 48 * i, y + BOX_H - 6)
          ctx.stroke()
        }
        ctx.fillStyle = '#bbf7d0'
        ctx.font = 'bold 13px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(k, x + 48 * i + 24, y + BOX_H / 2)
      })
      ctx.globalAlpha = 1
    }

    function drawArrow(ctx, from, to, alpha) {
      ctx.globalAlpha = alpha * 0.4
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    function render() {
      ctx.clearRect(0, 0, W, H)

      const CYCLE = 120
      t++
      if (t >= CYCLE) { t = 0; stateIdx = (stateIdx + 1) % STATES.length }

      const f = Math.min(t / 30, 1) // 0→1 in first 30 frames (fade in)
      const state = STATES[stateIdx]

      // Draw connecting arrows
      state.nodes.forEach(node => {
        state.leaves.forEach(leaf => {
          drawArrow(ctx, { x: node.x, y: node.y + 36 }, { x: leaf.x, y: leaf.y }, f)
        })
      })

      // Draw internal nodes
      state.nodes.forEach(node => drawNode(ctx, node, f, t > 90))

      // Draw leaves
      state.leaves.forEach((leaf, i) => {
        const isNew = stateIdx > 0 && i === state.leaves.length - 1 && t < 40
        drawLeaf(ctx, leaf, isNew ? Math.min(t / 20, 1) : f, isNew)
      })

      // Label
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('B+ Tree — live insertion', W / 2, H - 12)
      ctx.globalAlpha = 1

      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

// ── Feature Cards ─────────────────────────────────────────────────────────────
const MODULES = [
  {
    tag: 'Data Structures', title: 'B+ Tree',
    desc: 'Visualize insertions, deletions, node splits and merges step-by-step.',
    path: '/data-structures/bplustree',
    difficulty: 'Intermediate', time: '12 min',
    color: 'border-db-purple/30 hover:border-db-purple/60',
    accentText: 'text-db-purple',
  },
  {
    tag: 'Query Processing', title: 'SQL Pipeline',
    desc: 'Watch a SELECT query flow through each execution stage with animated row movement.',
    path: '/query-processing/sql-pipeline',
    difficulty: 'Beginner', time: '8 min',
    color: 'border-db-blue/30 hover:border-db-blue/60',
    accentText: 'text-db-blue',
  },
  {
    tag: 'Query Processing', title: 'Join Algorithms',
    desc: 'Side-by-side comparison of Nested Loop, Hash Join, and Merge Join.',
    path: '/query-processing/joins',
    difficulty: 'Intermediate', time: '10 min',
    color: 'border-db-blue/30 hover:border-db-blue/60',
    accentText: 'text-db-blue',
  },
  {
    tag: 'Transactions', title: 'Isolation Levels',
    desc: 'See dirty reads, phantom reads, and non-repeatable reads across all four isolation levels.',
    path: '/transactions/isolation-levels',
    difficulty: 'Advanced', time: '15 min',
    color: 'border-db-green/30 hover:border-db-green/60',
    accentText: 'text-db-green',
  },
  {
    tag: 'Transactions', title: 'MVCC',
    desc: 'How Postgres keeps old row versions so readers never block writers.',
    path: '/transactions/mvcc',
    difficulty: 'Advanced', time: '12 min',
    color: 'border-db-green/30 hover:border-db-green/60',
    accentText: 'text-db-green',
  },
  {
    tag: 'Transactions', title: 'Deadlocks',
    desc: 'Detect cycles in the wait-for graph and watch deadlock resolution play out.',
    path: '/transactions/deadlocks',
    difficulty: 'Advanced', time: '10 min',
    color: 'border-db-red/30 hover:border-db-red/60',
    accentText: 'text-db-red',
  },
  {
    tag: 'Transactions', title: 'ACID Properties',
    desc: 'Walk through Atomicity, Consistency, Isolation, and Durability with live failure scenarios.',
    path: '/transactions/acid',
    difficulty: 'Beginner', time: '8 min',
    color: 'border-db-green/30 hover:border-db-green/60',
    accentText: 'text-db-green',
  },
  {
    tag: 'Design', title: 'Normalization',
    desc: 'Decompose a denormalized table from 1NF to BCNF with animated functional dependencies.',
    path: '/design/normalization',
    difficulty: 'Beginner', time: '10 min',
    color: 'border-db-amber/30 hover:border-db-amber/60',
    accentText: 'text-db-amber',
  },
]

const DIFFICULTY_COLOR = {
  Beginner:     'bg-db-green/15  text-db-green',
  Intermediate: 'bg-db-amber/15  text-db-amber',
  Advanced:     'bg-db-red/15    text-db-red',
}

// ── Learning Path ─────────────────────────────────────────────────────────────
const LEARNING_PATH = [
  { step: 1, title: 'Storage Basics',    path: '/storage/heap-file',                    color: 'bg-db-purple' },
  { step: 2, title: 'B+ Trees',          path: '/data-structures/bplustree',            color: 'bg-db-purple' },
  { step: 3, title: 'Index Scans',       path: '/storage/scan-comparison',              color: 'bg-db-blue'   },
  { step: 4, title: 'SQL Pipeline',      path: '/query-processing/sql-pipeline',        color: 'bg-db-blue'   },
  { step: 5, title: 'Join Algorithms',   path: '/query-processing/joins',               color: 'bg-db-blue'   },
  { step: 6, title: 'Isolation Levels',  path: '/transactions/isolation-levels',        color: 'bg-db-green'  },
  { step: 7, title: 'MVCC',             path: '/transactions/mvcc',                    color: 'bg-db-green'  },
  { step: 8, title: 'Deadlocks',        path: '/transactions/deadlocks',               color: 'bg-db-red'    },
]

// ── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-db-bg text-white overflow-x-hidden">

      {/* Navbar */}
      <nav className="border-b border-db-border bg-db-card/80 backdrop-blur-sm sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">DB<span className="text-db-blue">Viz</span></span>
        <Link to="/data-structures/bplustree"
          className="px-4 py-1.5 bg-db-blue hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors">
          Start Exploring →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-db-blue/30 bg-db-blue/10 text-db-blue text-xs font-mono mb-6">
            Interactive Learning Platform
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            Understand<br />
            Databases<br />
            <span className="text-db-blue">Visually</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed max-w-md">
            Explore indexes, query execution, transactions, normalization and storage engines through interactive simulations.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/data-structures/bplustree"
              className="px-6 py-3 bg-db-blue hover:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-colors">
              Start Exploring
            </Link>
            <Link to="/query-processing/joins"
              className="px-6 py-3 border border-db-border hover:border-db-blue/50 text-slate-300 hover:text-white rounded-xl font-semibold text-sm transition-colors">
              See Join Algorithms →
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-10 flex gap-8">
            {[['13+', 'Simulations'], ['5', 'Categories'], ['Free', 'Always']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold text-white">{v}</div>
                <div className="text-xs text-db-muted">{l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-db-card border border-db-border rounded-2xl overflow-hidden h-72 shadow-2xl shadow-black/50"
        >
          <HeroBTree />
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Core Simulations</h2>
          <span className="text-db-muted text-sm">{MODULES.length} modules</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((mod, i) => (
            <motion.div
              key={mod.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Link to={mod.path} className={`block bg-db-card border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/30 ${mod.color}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border border-current/20 ${mod.accentText}`}>{mod.tag}</span>
                  <span className="text-db-muted text-sm">&#8250;</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-1">{mod.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{mod.desc}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${DIFFICULTY_COLOR[mod.difficulty]}`}>
                    {mod.difficulty}
                  </span>
                  <span className="text-xs text-db-muted">{mod.time}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Learning Path */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="bg-db-card border border-db-border rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">Recommended Learning Path</h2>
          <p className="text-db-muted text-sm mb-8">Follow this sequence to build a solid mental model from the ground up.</p>
          <div className="relative">
            {/* Line */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-db-border" />
            <div className="space-y-4">
              {LEARNING_PATH.map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link to={item.path} className="flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white text-sm font-bold shrink-0 z-10 group-hover:scale-110 transition-transform`}>
                      {item.step}
                    </div>
                    <div className="flex-1 py-3 px-4 bg-db-surface border border-db-border rounded-xl group-hover:border-slate-500 transition-colors">
                      <span className="text-sm font-medium text-white group-hover:text-db-blue transition-colors">{item.title}</span>
                    </div>
                    <span className="text-db-muted group-hover:text-white transition-colors text-sm">→</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-db-border py-8 text-center text-db-muted text-sm">
        DBViz — Database & SQL Engine Visualizer
      </footer>
    </div>
  )
}
