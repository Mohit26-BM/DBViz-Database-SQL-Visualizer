// Deadlock simulation — wait-for graph with cycle detection and resolution

export function deadlockSteps() {
  const steps = []

  const push = (graph, locks, event, explanation, why, highlight = [], cycleEdges = [], resolved = false) =>
    steps.push({ graph, locks, event, explanation, why, highlight, cycleEdges, resolved })

  // Initial state
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [] },
    { R1: null, R2: null, R3: null },
    'init',
    'Three transactions and three resources. No locks held yet.',
    'A deadlock forms when transactions form a cycle of lock-wait dependencies.'
  )

  // T1 acquires R1
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [] },
    { R1: 'T1', R2: null, R3: null },
    'T1 acquires R1',
    'T1 acquires an exclusive lock on Resource R1.',
    'Lock acquisition succeeds immediately because no other transaction holds R1.'
  )

  // T2 acquires R2
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [] },
    { R1: 'T1', R2: 'T2', R3: null },
    'T2 acquires R2',
    'T2 acquires an exclusive lock on Resource R2.',
    'R2 is free, so T2 gets it without waiting.'
  )

  // T3 acquires R3
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [] },
    { R1: 'T1', R2: 'T2', R3: 'T3' },
    'T3 acquires R3',
    'T3 acquires an exclusive lock on Resource R3.',
    'All three resources are now held by different transactions.'
  )

  // T1 waits for R2 (held by T2)
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [{ from: 'T1', to: 'T2', label: 'waits for R2' }] },
    { R1: 'T1', R2: 'T2', R3: 'T3' },
    'T1 waits for R2',
    'T1 requests R2 — but T2 holds it. T1 is now blocked, waiting for T2.',
    'The wait-for graph gains edge T1 → T2 meaning "T1 is waiting for a resource T2 holds."',
    ['T1', 'T2']
  )

  // T2 waits for R3 (held by T3)
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [
      { from: 'T1', to: 'T2', label: 'waits for R2' },
      { from: 'T2', to: 'T3', label: 'waits for R3' },
    ]},
    { R1: 'T1', R2: 'T2', R3: 'T3' },
    'T2 waits for R3',
    'T2 requests R3 — held by T3. T2 is blocked, waiting for T3.',
    'T1 → T2 → T3 is a chain so far. Still no cycle.',
    ['T2', 'T3']
  )

  // T3 waits for R1 (held by T1) — CYCLE!
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [
      { from: 'T1', to: 'T2', label: 'waits for R2' },
      { from: 'T2', to: 'T3', label: 'waits for R3' },
      { from: 'T3', to: 'T1', label: 'waits for R1' },
    ]},
    { R1: 'T1', R2: 'T2', R3: 'T3' },
    'T3 waits for R1 — DEADLOCK',
    'T3 requests R1 — held by T1, which is waiting for T2, which is waiting for T3. Cycle detected!',
    'The cycle T1 → T2 → T3 → T1 means all three transactions are blocked forever. This is a deadlock.',
    ['T1', 'T2', 'T3'],
    [{ from: 'T1', to: 'T2' }, { from: 'T2', to: 'T3' }, { from: 'T3', to: 'T1' }]
  )

  // Resolution — victim T3 is aborted
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [
      { from: 'T1', to: 'T2', label: 'waits for R2' },
    ]},
    { R1: 'T1', R2: 'T2', R3: null },
    'T3 aborted (victim)',
    'The deadlock detector picks T3 as the victim and aborts it. T3 releases R3.',
    'Victim selection typically picks the transaction with the least work done or fewest locks. T3 is rolled back and will retry.',
    ['T3'],
    [],
    true
  )

  // T2 gets R3, continues
  push(
    { nodes: ['T1', 'T2', 'T3'], edges: [] },
    { R1: 'T1', R2: 'T2', R3: 'T2' },
    'Deadlock resolved',
    'T2 acquires R3 and proceeds. T1 can then acquire R2 after T2 commits. Deadlock is gone.',
    'Once the cycle is broken by the victim abort, the remaining transactions can proceed to completion.',
    [],
    [],
    true
  )

  return steps
}
