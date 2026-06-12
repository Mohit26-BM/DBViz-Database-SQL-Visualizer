export const QUERY_PLAN_SQL = [
  'SELECT customer, SUM(total) AS revenue',
  'FROM orders',
  'WHERE status = "SHIPPED" AND total >= 100',
  'GROUP BY customer',
  'ORDER BY revenue DESC;',
]

export const QUERY_PLAN_CODE = [
  'parse SQL into relational operators',
  'read table and index statistics',
  'enumerate candidate access paths',
  'estimate rows and I/O cost',
  'choose cheapest physical operators',
  'emit executable query plan',
]

export const QUERY_PLAN_TREE = [
  { id: 'sort', label: 'Sort', detail: 'ORDER BY revenue DESC', level: 0 },
  { id: 'agg', label: 'HashAggregate', detail: 'GROUP BY customer', level: 1 },
  { id: 'scan', label: 'Index Scan', detail: 'orders_status_total_idx', level: 2 },
]

const CANDIDATES = [
  { name: 'Seq Scan + Sort + Aggregate', cost: 148, rows: 7, badge: 'warning' },
  { name: 'Bitmap Index Scan + Heap Fetch', cost: 74, rows: 4, badge: 'info' },
  { name: 'Index Scan + HashAggregate', cost: 38, rows: 4, badge: 'success' },
]

function cloneCandidates(candidates) {
  return candidates.map(item => ({ ...item }))
}

export function queryPlanSteps() {
  return [
    {
      phase: 'parse',
      sql: [...QUERY_PLAN_SQL],
      candidates: [],
      selectedPlan: null,
      planTree: [],
      highlightLine: 0,
      explanation: 'The optimizer first parses SQL into a logical operator tree: scan, filter, aggregate, then sort.',
      why: 'Logical planning separates what the query asks for from how the database will physically execute it.',
    },
    {
      phase: 'stats',
      sql: [...QUERY_PLAN_SQL],
      candidates: [],
      selectedPlan: null,
      planTree: [],
      highlightLine: 1,
      explanation: 'Next it consults statistics such as row count, status selectivity, and whether a useful index exists.',
      why: 'Without cardinality estimates, the optimizer is just guessing about which operators will be cheap.',
    },
    {
      phase: 'enumerate',
      sql: [...QUERY_PLAN_SQL],
      candidates: cloneCandidates(CANDIDATES).map((item, index) => ({ ...item, active: index === 0 })),
      selectedPlan: null,
      planTree: [],
      highlightLine: 2,
      explanation: 'The optimizer enumerates multiple physical alternatives, starting with a plain sequential scan plan.',
      why: 'Cost-based optimization works by comparing several valid implementations of the same logical query.',
    },
    {
      phase: 'estimate',
      sql: [...QUERY_PLAN_SQL],
      candidates: cloneCandidates(CANDIDATES).map((item, index) => ({ ...item, active: index === 1 })),
      selectedPlan: null,
      planTree: [],
      highlightLine: 3,
      explanation: 'A bitmap plan looks better because the predicate is selective, but it still needs heap rechecks and extra bookkeeping.',
      why: 'Bitmap access can win in the middle ground: too many matches for random index fetches, too few for a full scan.',
    },
    {
      phase: 'choose',
      sql: [...QUERY_PLAN_SQL],
      candidates: cloneCandidates(CANDIDATES).map((item, index) => ({ ...item, active: index === 2 })),
      selectedPlan: CANDIDATES[2],
      planTree: QUERY_PLAN_TREE.map(node => ({ ...node })),
      highlightLine: 4,
      explanation: 'The optimizer chooses an index scan on shipped orders, then a hash aggregate, then a final sort on the grouped output.',
      why: 'This plan filters early, touches only matching tuples, and aggregates before sorting so fewer rows reach the final sort.',
    },
    {
      phase: 'final',
      sql: [...QUERY_PLAN_SQL],
      candidates: cloneCandidates(CANDIDATES).map(item => ({ ...item })),
      selectedPlan: CANDIDATES[2],
      planTree: QUERY_PLAN_TREE.map(node => ({ ...node })),
      highlightLine: 5,
      explanation: 'The resulting physical plan is what the executor will run step by step.',
      why: 'A query plan is the optimizer’s handoff to execution: concrete operators, concrete order, concrete cost tradeoffs.',
    },
  ]
}
