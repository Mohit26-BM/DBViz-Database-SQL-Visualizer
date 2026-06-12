import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SimHelp({ title, sections }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How to use"
        className="w-7 h-7 rounded-full border border-db-border bg-db-surface text-db-blue text-xs font-bold
                   hover:border-db-blue hover:bg-db-blue/10 transition-all flex items-center justify-center shrink-0"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-80 bg-db-surface border-l border-db-border z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-start justify-between px-5 py-4 border-b border-db-border shrink-0">
                <div>
                  <span className="text-[10px] font-mono text-db-blue uppercase tracking-widest">How to use</span>
                  <h3 className="text-white font-semibold text-sm mt-0.5">{title}</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-white text-xl leading-none mt-0.5 transition-colors"
                >
                  x
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {sections.map((sec, si) => (
                  <div key={si}>
                    <div className="text-[10px] font-mono text-db-blue uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>{sec.heading}</span>
                      <div className="flex-1 h-px bg-db-border" />
                    </div>
                    <div className="space-y-2.5">
                      {sec.items.map((item, ii) => (
                        <div key={ii} className="flex gap-2.5">
                          {item.icon && (
                            <span className="shrink-0 text-sm w-5 text-center mt-px text-db-muted">{item.icon}</span>
                          )}
                          <div className="text-xs leading-relaxed">
                            {item.label && (
                              <span className="text-slate-200 font-medium">{item.label}</span>
                            )}
                            {item.label && item.text && (
                              <span className="text-slate-600"> — </span>
                            )}
                            {item.text && (
                              <span className="text-slate-500">{item.text}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-db-border shrink-0">
                <p className="text-[10px] text-slate-600 font-mono">
                  Step through the simulation using the controls below the canvas.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
