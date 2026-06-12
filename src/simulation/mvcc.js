// MVCC simulation — version chain visualization (PostgreSQL model)

export function mvccSteps() {
  const steps = []

  // Each row version: { xmin, xmax, value, visible }
  // xmin = transaction that created it, xmax = transaction that deleted/updated it (0 = still live)

  const push = (versions, txids, event, explanation, why, readTxid = null, visibleVersion = null) =>
    steps.push({ versions, txids: [...txids], event, explanation, why, readTxid, visibleVersion })

  let txids = []
  let versions = []

  push(
    [],
    [],
    'init',
    'Empty table. No row versions yet.',
    'In MVCC, every INSERT creates a new row version (tuple) tagged with the inserting transaction\'s ID (xmin).'
  )

  // T1 inserts row (balance = 100)
  txids = [{ id: 100, state: 'committed', action: 'INSERT balance=100' }]
  versions = [{ id: 1, xmin: 100, xmax: 0, value: 100, dead: false }]
  push(versions, txids, 'T1 inserts',
    'Transaction 100 (T1) inserts a row with balance = 100. xmin=100, xmax=0 (live).',
    'xmin is set to the inserting transaction\'s ID. xmax=0 means no transaction has deleted or updated this version yet.'
  )

  // T2 starts (reads snapshot at txid 200)
  txids = [
    { id: 100, state: 'committed', action: 'INSERT balance=100' },
    { id: 200, state: 'active',    action: 'SELECT balance ...' },
  ]
  push(versions, txids, 'T2 starts',
    'Transaction 200 (T2) begins and takes a snapshot. It will only see versions committed before txid 200.',
    'MVCC snapshots are taken at transaction start (REPEATABLE READ) or per-statement (READ COMMITTED).',
    200, 1
  )

  // T3 updates balance to 150 (creates new version)
  txids = [
    { id: 100, state: 'committed', action: 'INSERT balance=100' },
    { id: 200, state: 'active',    action: 'SELECT balance ...' },
    { id: 300, state: 'active',    action: 'UPDATE balance=150' },
  ]
  versions = [
    { id: 1, xmin: 100, xmax: 300, value: 100, dead: false },
    { id: 2, xmin: 300, xmax: 0,   value: 150, dead: false },
  ]
  push(versions, txids, 'T3 updates to 150',
    'Transaction 300 (T3) updates balance to 150. Old version gets xmax=300; new version xmin=300.',
    'UPDATE = mark old version deleted (xmax = updating txid) + INSERT new version. No in-place modification!',
    200, 1
  )

  // T2 reads — sees version 1 (100), not version 2
  push(versions, txids, 'T2 reads balance',
    'T2 reads balance and sees 100 — the version visible at its snapshot time (txid < 200).',
    'Version 2 has xmin=300 which is >= T2\'s snapshot txid (200), so T2 cannot see it. Readers never block writers.',
    200, 1
  )

  // T3 commits
  txids = [
    { id: 100, state: 'committed', action: 'INSERT balance=100' },
    { id: 200, state: 'active',    action: 'SELECT balance ...' },
    { id: 300, state: 'committed', action: 'UPDATE balance=150' },
  ]
  push(versions, txids, 'T3 commits',
    'T3 commits. Version 2 (balance=150) is now committed but T2 still cannot see it.',
    'T2\'s snapshot was taken before T3 started. Even after T3 commits, T2\'s view is frozen — this is REPEATABLE READ.',
    200, 1
  )

  // T4 starts after T3 — sees 150
  txids = [
    { id: 100, state: 'committed', action: 'INSERT balance=100' },
    { id: 200, state: 'active',    action: 'SELECT balance ...' },
    { id: 300, state: 'committed', action: 'UPDATE balance=150' },
    { id: 400, state: 'active',    action: 'SELECT balance ...' },
  ]
  push(versions, txids, 'T4 reads balance',
    'Transaction 400 (T4) starts after T3 committed. T4 sees balance = 150.',
    'T4\'s snapshot includes T3 (txid 300 < 400 and committed). It follows the version chain and finds version 2.',
    400, 2
  )

  // T2 commits, old version marked dead
  txids = [
    { id: 100, state: 'committed', action: null },
    { id: 200, state: 'committed', action: 'COMMIT' },
    { id: 300, state: 'committed', action: null },
    { id: 400, state: 'active',    action: 'SELECT balance ...' },
  ]
  versions = [
    { id: 1, xmin: 100, xmax: 300, value: 100, dead: true },
    { id: 2, xmin: 300, xmax: 0,   value: 150, dead: false },
  ]
  push(versions, txids, 'T2 commits — old version dead',
    'T2 commits. Version 1 (balance=100) is now dead — no active transaction can see it anymore.',
    'Dead tuples are reclaimed by VACUUM. Until then they occupy space in the heap file.',
    400, 2
  )

  return steps
}
