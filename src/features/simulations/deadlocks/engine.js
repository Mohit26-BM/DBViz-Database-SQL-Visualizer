/**
 * Deadlock engine — typed state model.
 *
 * Each step contains:
 *   transactions: { id, holding: string[], waitingFor: string | null, state: 'active'|'victim'|'free' }[]
 *   resources:    { id, heldBy: string | null }[]
 *   cycleExists:  boolean
 *   cycleIds:     string[]    — transaction IDs in the cycle
 *   victim:       string | null
 *   resolved:     boolean
 *   event:        string
 *   explanation:  string
 *   why:          string
 */

function step(transactions, resources, event, explanation, why, cycleExists = false, cycleIds = [], victim = null, resolved = false) {
  return {
    transactions: transactions.map(t => ({ ...t })),
    resources: resources.map(r => ({ ...r })),
    cycleExists, cycleIds, victim, resolved,
    event, explanation, why,
  }
}

export function deadlockSteps() {
  const steps = []

  const tx = (id, holding, waitingFor, state = 'active') => ({ id, holding, waitingFor, state })
  const res = (id, heldBy) => ({ id, heldBy })

  // Initial state — no locks
  let T = [tx('T1', [], null), tx('T2', [], null), tx('T3', [], null)]
  let R = [res('R1', null), res('R2', null), res('R3', null)]

  steps.push(step(T, R, 'init',
    'Three transactions and three resources. No locks held yet.',
    'A deadlock is a cycle of lock-wait dependencies. We will build one step by step.'
  ))

  // T1 acquires R1
  T = [tx('T1', ['R1'], null), tx('T2', [], null), tx('T3', [], null)]
  R = [res('R1', 'T1'), res('R2', null), res('R3', null)]
  steps.push(step(T, R, 'T1 acquires R1',
    'T1 acquires an exclusive lock on R1.',
    'R1 is free, so T1 gets it immediately.'
  ))

  // T2 acquires R2
  T = [tx('T1', ['R1'], null), tx('T2', ['R2'], null), tx('T3', [], null)]
  R = [res('R1', 'T1'), res('R2', 'T2'), res('R3', null)]
  steps.push(step(T, R, 'T2 acquires R2',
    'T2 acquires an exclusive lock on R2.',
    'R2 is free. All three transactions are accumulating locks.'
  ))

  // T3 acquires R3
  T = [tx('T1', ['R1'], null), tx('T2', ['R2'], null), tx('T3', ['R3'], null)]
  R = [res('R1', 'T1'), res('R2', 'T2'), res('R3', 'T3')]
  steps.push(step(T, R, 'T3 acquires R3',
    'T3 acquires an exclusive lock on R3.',
    'All three resources are held. The stage is set for deadlock.'
  ))

  // T1 waits for R2 (held by T2)
  T = [tx('T1', ['R1'], 'R2'), tx('T2', ['R2'], null), tx('T3', ['R3'], null)]
  steps.push(step(T, R, 'T1 waits for R2',
    'T1 requests R2 — held by T2. T1 blocks. Wait-for edge: T1 → T2.',
    'The wait-for graph now has one edge: T1 → T2 (T1 waits for something T2 holds).'
  ))

  // T2 waits for R3 (held by T3)
  T = [tx('T1', ['R1'], 'R2'), tx('T2', ['R2'], 'R3'), tx('T3', ['R3'], null)]
  steps.push(step(T, R, 'T2 waits for R3',
    'T2 requests R3 — held by T3. T2 blocks. Chain so far: T1 → T2 → T3.',
    'Still no cycle. T3 is the end of the chain and holds no pending request.'
  ))

  // T3 waits for R1 (held by T1) — CYCLE
  T = [tx('T1', ['R1'], 'R2'), tx('T2', ['R2'], 'R3'), tx('T3', ['R3'], 'R1')]
  steps.push(step(T, R, 'DEADLOCK — T3 waits for R1',
    'T3 requests R1 — held by T1. Cycle detected: T1 → T2 → T3 → T1.',
    'Every transaction in the cycle is blocked waiting for the next. None can proceed. This is a deadlock.',
    true, ['T1', 'T2', 'T3'], null, false
  ))

  // Victim: T3 aborted
  T = [tx('T1', ['R1'], 'R2'), tx('T2', ['R2'], 'R3'), tx('T3', [], null, 'victim')]
  R = [res('R1', 'T1'), res('R2', 'T2'), res('R3', null)]
  steps.push(step(T, R, 'T3 selected as victim',
    'The deadlock detector selects T3 as the victim and aborts it. T3 releases R3.',
    'Victim selection typically aborts the transaction with the least work done or lowest priority. T3 is rolled back and may retry.',
    true, ['T1', 'T2', 'T3'], 'T3', false
  ))

  // Resolution
  T = [tx('T1', ['R1', 'R2'], null), tx('T2', ['R2', 'R3'], null), tx('T3', [], null, 'free')]
  R = [res('R1', 'T1'), res('R2', 'T2'), res('R3', 'T2')]
  steps.push(step(T, R, 'Deadlock resolved',
    'T2 acquires R3 and proceeds. T1 will acquire R2 after T2 commits. All transactions can progress.',
    'Breaking one edge in the cycle is enough. The remaining transactions proceed to completion in serial order.',
    false, [], null, true
  ))

  return steps
}
