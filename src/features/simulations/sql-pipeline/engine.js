/**
 * SQL Pipeline engine.
 *
 * Query: SELECT customer, SUM(total) AS rev
 *        FROM orders
 *        WHERE status = 'SHIPPED'
 *        GROUP BY customer
 *        ORDER BY rev DESC
 *
 * Stages: Seq Scan → Filter → Aggregate → Sort → Output
 *
 * Each step:
 *   stages:          StageState[]      — current in/out counts and status per stage
 *   activeStage:     string            — id of the currently executing stage
 *   tableRows:       Row[]             — rows visible in the data table at this step
 *   highlightRowIds: number[]          — row indexes to highlight in the table
 *   rowMeta:         Record<number, {badge, variant}> — per-row status badge
 *   explanation:     string
 *   why:             string
 *   highlightLine:   number            — SQL line to highlight
 */

export const PIPELINE_SQL = [
  'SELECT customer, SUM(total) AS rev',
  'FROM orders',
  'WHERE status = \'SHIPPED\'',
  'GROUP BY customer',
  'ORDER BY rev DESC',
  ';',
]

export const STAGES = [
  { id: 'scan',      name: 'Seq Scan',   cost: 'O(n)',       line: 1 },
  { id: 'filter',    name: 'Filter',     cost: 'O(n)',       line: 2 },
  { id: 'aggregate', name: 'Aggregate',  cost: 'O(n)',       line: 3 },
  { id: 'sort',      name: 'Sort',       cost: 'O(k log k)', line: 4 },
  { id: 'output',    name: 'Output',     cost: '',           line: 0 },
]

const ALL_ORDERS = [
  { id: 1, customer: 'Alice', status: 'SHIPPED',   total: 120 },
  { id: 2, customer: 'Bob',   status: 'PENDING',   total: 85  },
  { id: 3, customer: 'Alice', status: 'SHIPPED',   total: 95  },
  { id: 4, customer: 'Carol', status: 'SHIPPED',   total: 200 },
  { id: 5, customer: 'Bob',   status: 'CANCELLED', total: 60  },
  { id: 6, customer: 'Carol', status: 'SHIPPED',   total: 150 },
  { id: 7, customer: 'Alice', status: 'PENDING',   total: 75  },
]

function stageState(id, status, rowsIn, rowsOut) {
  return { id, status, rowsIn, rowsOut }
}

function pending(id) { return stageState(id, 'pending', 0, 0) }
function done(id, rowsIn, rowsOut) { return stageState(id, 'done', rowsIn, rowsOut) }
function active(id, rowsIn, rowsOut) { return stageState(id, 'active', rowsIn, rowsOut) }

export function sqlPipelineSteps() {
  const steps = []

  const push = (activeStage, stages, tableRows, highlightRowIds, rowMeta, explanation, why, highlightLine = -1) =>
    steps.push({ activeStage, stages, tableRows, highlightRowIds, rowMeta, explanation, why, highlightLine })

  // Step 0 — initial
  push('scan',
    [pending('scan'), pending('filter'), pending('aggregate'), pending('sort'), pending('output')],
    ALL_ORDERS, [], {},
    'The query planner selects a Sequential Scan as the first operator. It will read every row from the heap file.',
    'Without an index on "status", the only option is reading the entire table. The planner minimizes cost by choosing this plan.',
    1
  )

  // Step 1 — Seq Scan scanning rows 1-3
  push('scan',
    [active('scan', 7, 7), pending('filter'), pending('aggregate'), pending('sort'), pending('output')],
    ALL_ORDERS, [0, 1, 2],
    { 0: { badge: 'scanned', variant: 'active' }, 1: { badge: 'scanned', variant: 'active' }, 2: { badge: 'scanned', variant: 'active' } },
    'Seq Scan reads rows 1–3 from the heap. All 7 rows will pass through regardless of content.',
    'A sequential scan reads pages in disk order. Every tuple on every page is fetched — no filtering yet.',
    1
  )

  // Step 2 — Seq Scan complete
  push('scan',
    [done('scan', 7, 7), pending('filter'), pending('aggregate'), pending('sort'), pending('output')],
    ALL_ORDERS, [3, 4, 5, 6],
    { 3: { badge: 'scanned', variant: 'active' }, 4: { badge: 'scanned', variant: 'active' },
      5: { badge: 'scanned', variant: 'active' }, 6: { badge: 'scanned', variant: 'active' } },
    'Seq Scan complete. All 7 rows read. Now rows flow into the Filter operator.',
    'The scan pushes rows one at a time to the next operator via the executor\'s "pull" model (Volcano iterator).',
    1
  )

  // Step 3 — Filter starts, passing first SHIPPED rows
  const shipped = ALL_ORDERS.filter(r => r.status === 'SHIPPED')
  const filteredMeta = {}
  ALL_ORDERS.forEach((r, i) => {
    filteredMeta[i] = r.status === 'SHIPPED'
      ? { badge: 'PASS', variant: 'pass' }
      : { badge: 'FAIL', variant: 'fail' }
  })

  push('filter',
    [done('scan', 7, 7), active('filter', 7, 4), pending('aggregate'), pending('sort'), pending('output')],
    ALL_ORDERS, [1, 4, 6],
    filteredMeta,
    'Filter applies WHERE status = \'SHIPPED\'. Rows where status is PENDING or CANCELLED are discarded.',
    'The Filter operator evaluates a predicate on each row. Non-matching rows are dropped immediately — they never reach downstream operators.',
    2
  )

  // Step 4 — Filter complete, show only shipped rows
  push('filter',
    [done('scan', 7, 7), done('filter', 7, 4), pending('aggregate'), pending('sort'), pending('output')],
    shipped, [], {},
    '4 rows survived the filter (both Alice orders + both Carol orders). The 3 non-SHIPPED rows were dropped.',
    'Pushing selection (filtering) early is a key query optimization. Fewer rows = less work for all downstream operators.',
    2
  )

  // Step 5 — Aggregate
  const aggregated = [
    { customer: 'Alice', rev: 215 },
    { customer: 'Carol', rev: 350 },
  ]

  push('aggregate',
    [done('scan', 7, 7), done('filter', 7, 4), active('aggregate', 4, 2), pending('sort'), pending('output')],
    shipped,
    [0, 2],
    { 0: { badge: 'group: Alice', variant: 'active' }, 1: { badge: 'group: Carol', variant: 'active' },
      2: { badge: 'group: Alice', variant: 'active' }, 3: { badge: 'group: Carol', variant: 'active' } },
    'Aggregate groups by customer and computes SUM(total). Alice: 120+95=215. Carol: 200+150=350.',
    'Hash aggregation builds a hash table keyed by GROUP BY columns. SUM accumulates into each bucket. Result: one row per group.',
    3
  )

  // Step 6 — Aggregate complete
  push('aggregate',
    [done('scan', 7, 7), done('filter', 7, 4), done('aggregate', 4, 2), pending('sort'), pending('output')],
    aggregated.map(r => ({ id: null, customer: r.customer, status: '', total: r.rev })),
    [], {},
    '2 aggregate rows produced: Alice=215, Carol=350. Now they enter the Sort operator.',
    'Aggregate reduced 4 rows to 2 groups. The output schema changed: we no longer have individual order rows, only grouped summaries.',
    3
  )

  // Step 7 — Sort
  const sorted = [
    { customer: 'Carol', rev: 350 },
    { customer: 'Alice', rev: 215 },
  ]

  push('sort',
    [done('scan', 7, 7), done('filter', 7, 4), done('aggregate', 4, 2), active('sort', 2, 2), pending('output')],
    aggregated.map(r => ({ id: null, customer: r.customer, status: '', total: r.rev })),
    [0, 1],
    { 0: { badge: 'sorting', variant: 'warning' }, 1: { badge: 'sorting', variant: 'warning' } },
    'Sort reorders the 2 rows by rev DESC. Carol (350) moves before Alice (215).',
    'ORDER BY requires all rows to be materialized before any can be output. For k rows, cost is O(k log k). With only 2 rows, this is trivial.',
    4
  )

  // Step 8 — Output
  push('output',
    [done('scan', 7, 7), done('filter', 7, 4), done('aggregate', 4, 2), done('sort', 2, 2), done('output', 2, 2)],
    sorted.map(r => ({ id: null, customer: r.customer, status: '', total: r.rev })),
    [0, 1],
    { 0: { badge: 'returned', variant: 'pass' }, 1: { badge: 'returned', variant: 'pass' } },
    'Query complete. 2 result rows returned to the client: Carol=350, Alice=215.',
    '7 rows scanned → 4 filtered → 2 grouped → 2 sorted → 2 returned. The pipeline processed only what each stage needed.',
    0
  )

  return steps
}
