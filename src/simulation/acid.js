// ACID Properties simulation — four scenarios, one per property

export const ACID_PROPERTIES = ['Atomicity', 'Consistency', 'Isolation', 'Durability']

export const PROPERTY_META = {
  Atomicity: {
    tagline: 'All or nothing — a transaction either fully commits or fully rolls back.',
    color: 'blue',
  },
  Consistency: {
    tagline: 'A transaction takes the database from one valid state to another valid state.',
    color: 'purple',
  },
  Isolation: {
    tagline: 'Concurrent transactions appear to execute serially from each other\'s perspective.',
    color: 'green',
  },
  Durability: {
    tagline: 'Once committed, changes survive system failures.',
    color: 'amber',
  },
}

function step(property, phase, dbState, txLog, event, explanation, why, isFailure = false) {
  return { property, phase, dbState, txLog: [...txLog], event, explanation, why, isFailure }
}

function atomicitySteps() {
  const steps = []
  const log = []
  let db = { accounts: { A: 1000, B: 500 } }

  log.push('BEGIN TRANSACTION')
  steps.push(step('Atomicity', 'begin', { ...db.accounts }, log,
    'begin',
    'Transaction begins: transfer $200 from Account A to Account B.',
    'Both the debit and the credit must succeed together, or neither should happen.'
  ))

  log.push('UPDATE A = 1000 - 200 = 800')
  steps.push(step('Atomicity', 'debit', { A: 800, B: 500 }, log,
    'debit',
    'Step 1: Account A debited $200. Balance drops from $1000 to $800.',
    'The debit is written to the transaction buffer — not yet committed to disk.'
  ))

  log.push('-- SYSTEM CRASH before credit --')
  steps.push(step('Atomicity', 'crash', { A: 800, B: 500 }, log,
    'crash',
    'System crash! The credit to Account B never executed.',
    'Without atomicity, A would lose $200 permanently with B gaining nothing.',
    true
  ))

  const rollbackLog = [...log, 'ROLLBACK: A restored to 1000']
  steps.push(step('Atomicity', 'rollback', { A: 1000, B: 500 }, rollbackLog,
    'rollback',
    'Database recovers and rolls back. Account A is restored to $1000.',
    'Atomicity guarantees the undo log is replayed on crash recovery, reverting all partial changes.'
  ))

  return steps
}

function consistencySteps() {
  const steps = []
  const log = []
  let balanceA = 1000, balanceB = 500
  const total = balanceA + balanceB

  log.push('BEGIN TRANSACTION')
  steps.push(step('Consistency', 'begin', { A: balanceA, B: balanceB, total },
    log, 'begin',
    `Constraint: total balance must always equal $${total}. Currently A=$${balanceA}, B=$${balanceB}.`,
    'Consistency means application-level rules (constraints, foreign keys, triggers) hold before and after every transaction.'
  ))

  log.push('UPDATE A = 1000 - 300 = 700')
  steps.push(step('Consistency', 'debit', { A: 700, B: 500, total },
    log, 'debit',
    'A debited $300. Total temporarily appears as $1200 — the constraint is mid-violation inside the transaction.',
    'Consistency applies at transaction boundaries, not within them. Intermediate states may break invariants.'
  ))

  log.push('UPDATE B = 500 + 300 = 800')
  steps.push(step('Consistency', 'credit', { A: 700, B: 800, total },
    log, 'credit',
    'B credited $300. Total is again $1500 — constraint restored.',
    'Both sides of the transfer are now complete. The invariant holds again.'
  ))

  log.push('COMMIT')
  steps.push(step('Consistency', 'commit', { A: 700, B: 800, total },
    log, 'commit',
    'Transaction commits. A=$700, B=$800, total=$1500. Constraint satisfied.',
    'The database engine verifies all constraints on commit. If any rule would be violated, the transaction is rejected.'
  ))

  return steps
}

function isolationSteps() {
  const steps = []

  steps.push(step('Isolation', 'begin', { balance: 1000 }, [],
    'begin',
    'Two transactions start concurrently. T1 will transfer $200; T2 will read the balance.',
    'Without isolation, T2 could read a value that T1 later rolls back (a dirty read).'
  ))

  steps.push(step('Isolation', 'tx1-write', { balance: 1000 }, ['T1: UPDATE balance = 800 (uncommitted)'],
    'tx1-write',
    'T1 writes balance = 800 but has not committed.',
    'Under READ COMMITTED or higher, T2 cannot see this uncommitted change.'
  ))

  steps.push(step('Isolation', 'tx2-read', { balance: 1000 }, ['T1: UPDATE balance = 800 (uncommitted)', 'T2: SELECT balance → 1000 (sees committed value)'],
    'tx2-read',
    'T2 reads balance = 1000 — the last committed value, not T1\'s dirty write.',
    'Isolation ensures each transaction sees a consistent snapshot, preventing interference.'
  ))

  steps.push(step('Isolation', 'tx1-rollback', { balance: 1000 }, ['T1: UPDATE balance = 800 (uncommitted)', 'T2: SELECT balance → 1000', 'T1: ROLLBACK'],
    'tx1-rollback',
    'T1 rolls back. Balance remains 1000. T2\'s read was correct all along.',
    'If T2 had seen 800 (dirty read), it would have acted on a value that never existed.'
  ))

  steps.push(step('Isolation', 'done', { balance: 1000 }, ['T1: ROLLBACK', 'T2: COMMIT (balance=1000)'],
    'done',
    'T2 commits with the correct value. Isolation prevented a dirty-read anomaly.',
    'Higher isolation levels add more protection at the cost of concurrency (locking or MVCC overhead).'
  ))

  return steps
}

function durabilitySteps() {
  const steps = []
  const log = []

  log.push('BEGIN TRANSACTION')
  steps.push(step('Durability', 'begin', { balance: 1000 }, log,
    'begin',
    'Transaction: credit account by $500.',
    'Durability means the committed result must persist even if the server crashes immediately after.'
  ))

  log.push('UPDATE balance = 1500')
  log.push('Write-Ahead Log (WAL): record [UPDATE balance=1500] flushed to disk')
  steps.push(step('Durability', 'wal', { balance: 1500 }, log,
    'wal',
    'Change written to the Write-Ahead Log (WAL) on disk before the commit returns.',
    'WAL ensures the change is durable on disk before the client receives the commit acknowledgement.'
  ))

  log.push('COMMIT acknowledged to client')
  steps.push(step('Durability', 'commit', { balance: 1500 }, log,
    'commit',
    'Commit acknowledged. Client knows the $500 credit is permanent.',
    'The DB can now update the heap file at any time via a background checkpoint — the WAL is the safety net.'
  ))

  log.push('-- POWER FAILURE --')
  steps.push(step('Durability', 'crash', { balance: '???' }, log,
    'crash',
    'Power failure! The heap file page may not have been updated yet.',
    'Without WAL or similar, the commit acknowledgement would have been a lie.',
    true
  ))

  log.push('Recovery: replay WAL → balance = 1500 restored')
  steps.push(step('Durability', 'recovery', { balance: 1500 }, log,
    'recovery',
    'On restart, the database replays the WAL and restores balance = 1500.',
    'Durability is implemented via write-ahead logging, fsync, and crash recovery replay.'
  ))

  return steps
}

export function acidSteps(property) {
  switch (property) {
    case 'Atomicity':    return atomicitySteps()
    case 'Consistency':  return consistencySteps()
    case 'Isolation':    return isolationSteps()
    case 'Durability':   return durabilitySteps()
    default:             return atomicitySteps()
  }
}
