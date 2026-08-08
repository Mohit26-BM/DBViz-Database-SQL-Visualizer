import { useEffect, useState, useRef } from 'react'
import Groq from 'groq-sdk'

export default function AIExplainer({ simulation, step, stepIndex, totalSteps }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  async function explain() {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setOpen(true)
    setLoading(true)

    if (!import.meta.env.VITE_GROQ_API_KEY) {
      setText('AI explanations are unavailable until VITE_GROQ_API_KEY is configured.')
      setLoading(false)
      return
    }

    const client = new Groq({
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      dangerouslyAllowBrowser: true,
    })

    try {
      const stream = await client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        max_tokens: 160,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are a database professor explaining database internals to students. Be concise — max 3 sentences. Focus on WHY this step matters and its performance or correctness implications, not just what it does.',
          },
          {
            role: 'user',
            content: `Simulation: ${simulation}. Step ${stepIndex + 1} of ${totalSteps}: "${step?.explanation ?? JSON.stringify(step)}". Explain what is happening and why it matters.`,
          },
        ],
      }, { signal: controller.signal })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        setText(prev => prev + delta)
      }
    } catch (e) {
      if (e.name !== 'AbortError') setText('Could not load explanation. Check your VITE_GROQ_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={explain}
        className="flex items-center gap-2 text-xs text-db-blue hover:text-blue-300 transition-colors"
      >
        <span className="text-sm leading-none">✦</span>
        Explain this step with AI
      </button>
      {open && (
        <div className="mt-2 p-3 bg-db-blue/10 border border-db-blue/20 rounded-lg text-sm text-slate-200 leading-relaxed min-h-[48px]">
          {loading && !text && <span className="text-db-blue animate-pulse">Thinking...</span>}
          {text}
          {loading && text && <span className="animate-pulse">▍</span>}
        </div>
      )}
    </div>
  )
}
