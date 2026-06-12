// Simulates two concurrent transactions to show isolation anomalies

export const LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']

export const LEVEL_ANOMALIES = {
  'READ UNCOMMITTED': { dirtyRead: true,  nonRepeatableRead: true,  phantomRead: true  },
  'READ COMMITTED':   { dirtyRead: false, nonRepeatableRead: true,  phantomRead: true  },
  'REPEATABLE READ':  { dirtyRead: false, nonRepeatableRead: false, phantomRead: true  },
  'SERIALIZABLE':     { dirtyRead: false, nonRepeatableRead: false, phantomRead: false },
}

export function isolationSteps(level) {
  const anomalies = LEVEL_ANOMALIES[level]
  const steps = []

  // Shared DB state
  let dbBalance = 100
  let uncommittedBalance = null
  let txBSnapshot = null

  // Step helper
  const push = (txA, txB, dbVal, event, explanation, why) =>
    steps.push({ txA, txB, dbValue: dbVal, event, explanation, why, level })

  push(
    { state: 'idle',   action: null },
    { state: 'idle',   action: null },
    dbBalance, 'init',
    `Starting with balance = ${dbBalance}. Two transactions run concurrently under ${level}.`,
    'Isolation level controls which intermediate states Transaction B can observe.'
  )

  // T_A begins, reads balance
  push(
    { state: 'active', action: `BEGIN; SELECT balance → ${dbBalance}` },
    { state: 'idle',   action: null },
    dbBalance, 'tx-a-begin',
    `Transaction A begins and reads balance = ${dbBalance}.`,
    'T_A holds a snapshot of the row at the time of its first read.'
  )

  // T_A updates but does NOT commit
  uncommittedBalance = dbBalance - 50
  push(
    { state: 'active', action: `UPDATE balance = ${uncommittedBalance} (uncommitted)` },
    { state: 'idle',   action: null },
    dbBalance, 'tx-a-update',
    `Transaction A sets balance to ${uncommittedBalance} but has NOT committed yet.`,
    'The change exists only in T_A\'s write buffer. Other transactions may or may not see it depending on isolation level.'
  )

  // T_B begins and reads
  txBSnapshot = anomalies.dirtyRead ? uncommittedBalance : dbBalance
  push(
    { state: 'active', action: `UPDATE balance = ${uncommittedBalance} (uncommitted)` },
    { state: 'active', action: `BEGIN; SELECT balance → ${txBSnapshot}` },
    dbBalance, anomalies.dirtyRead ? 'dirty-read' : 'clean-read',
    anomalies.dirtyRead
      ? `DIRTY READ: Transaction B reads the uncommitted value ${uncommittedBalance} written by T_A.`
      : `Transaction B reads the last committed value ${dbBalance} — T_A's change is invisible.`,
    anomalies.dirtyRead
      ? 'READ UNCOMMITTED allows reading uncommitted data. If T_A rolls back, T_B has acted on a value that never existed.'
      : 'This level ensures T_B only sees committed data, preventing dirty reads.'
  )

  // T_A commits
  dbBalance = uncommittedBalance
  push(
    { state: 'committed', action: `COMMIT (balance = ${dbBalance})` },
    { state: 'active',    action: `SELECT balance → ???` },
    dbBalance, 'tx-a-commit',
    `Transaction A commits. Balance is now officially ${dbBalance}.`,
    'The commit makes T_A\'s change durable and visible to subsequent reads by other transactions at most isolation levels.'
  )

  // T_B reads again
  const txBSecondRead = anomalies.nonRepeatableRead ? dbBalance : txBSnapshot
  push(
    { state: 'committed', action: `COMMIT (balance = ${dbBalance})` },
    { state: 'active',    action: `SELECT balance again → ${txBSecondRead}` },
    dbBalance, anomalies.nonRepeatableRead ? 'non-repeatable-read' : 'repeatable-read',
    anomalies.nonRepeatableRead
      ? `NON-REPEATABLE READ: T_B re-reads balance and now sees ${txBSecondRead} (was ${txBSnapshot}).`
      : `REPEATABLE READ: T_B still sees ${txBSecondRead} — its snapshot is frozen from its first read.`,
    anomalies.nonRepeatableRead
      ? 'The same SELECT within one transaction returned different values. This can break application logic that assumes stability within a transaction.'
      : 'REPEATABLE READ pins the snapshot at transaction start. Re-reads of the same row always return the same value.'
  )

  // T_B commits
  push(
    { state: 'committed', action: null },
    { state: 'committed', action: 'COMMIT' },
    dbBalance, 'done',
    `Transaction B commits. Final balance: ${dbBalance}.`,
    `Under ${level}, the anomalies were: Dirty Read=${anomalies.dirtyRead}, Non-Repeatable Read=${anomalies.nonRepeatableRead}, Phantom Read=${anomalies.phantomRead}.`
  )

  return steps
}
