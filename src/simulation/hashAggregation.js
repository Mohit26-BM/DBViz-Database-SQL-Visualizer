export const HASH_AGG_INPUT = [
  { customer: 'Ana', total: 120 },
  { customer: 'Ben', total: 80 },
  { customer: 'Ana', total: 60 },
  { customer: 'Cara', total: 150 },
  { customer: 'Ben', total: 40 },
]

export const HASH_AGG_CODE = [
  'create empty hash table',
  'for each input row:',
  '  bucket = hash(groupKey)',
  '  if bucket missing: initialize state',
  '  state.sum += row.total',
  'emit one row per hash bucket',
]

function bucketsFromMap(map) {
  return Object.entries(map).map(([customer, sum]) => ({ customer, sum }))
}

export function hashAggregationSteps() {
  const states = {}
  const steps = [
    {
      phase: 'init',
      rows: HASH_AGG_INPUT.map(row => ({ ...row })),
      currentRowIndex: -1,
      buckets: [],
      output: [],
      highlightLine: 0,
      explanation: 'Hash aggregation starts with an empty in-memory hash table keyed by customer.',
      why: 'Grouping works by keeping one aggregate state per distinct group key.',
    },
  ]

  HASH_AGG_INPUT.forEach((row, index) => {
    if (!(row.customer in states)) {
      states[row.customer] = 0
      steps.push({
        phase: 'new-group',
        rows: HASH_AGG_INPUT.map(item => ({ ...item })),
        currentRowIndex: index,
        buckets: bucketsFromMap(states),
        output: [],
        highlightLine: 3,
        explanation: `Customer ${row.customer} creates a new hash bucket.`,
        why: 'The first row for a group allocates aggregate state that later rows can reuse.',
      })
    }

    states[row.customer] += row.total
    steps.push({
      phase: 'accumulate',
      rows: HASH_AGG_INPUT.map(item => ({ ...item })),
      currentRowIndex: index,
      buckets: bucketsFromMap(states),
      output: [],
      highlightLine: 4,
      explanation: `Row (${row.customer}, ${row.total}) updates the running sum to ${states[row.customer]}.`,
      why: 'Hash aggregation can aggregate on the fly without sorting the entire input first.',
    })
  })

  steps.push({
    phase: 'done',
    rows: HASH_AGG_INPUT.map(item => ({ ...item })),
    currentRowIndex: -1,
    buckets: bucketsFromMap(states),
    output: bucketsFromMap(states),
    highlightLine: 5,
    explanation: 'After the scan finishes, the executor emits one output row per hash bucket.',
    why: 'This is efficient when the number of groups fits in memory and input ordering is not already useful.',
  })

  return steps
}
