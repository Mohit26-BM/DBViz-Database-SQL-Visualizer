export const CLUSTERED_PAGES = [
  {
    id: 'C1',
    keys: [10, 20, 30],
    rows: [
      { orderId: 10, customer: 'Ana' },
      { orderId: 20, customer: 'Ben' },
      { orderId: 30, customer: 'Cara' },
    ],
  },
  {
    id: 'C2',
    keys: [40, 50, 60],
    rows: [
      { orderId: 40, customer: 'Dev' },
      { orderId: 50, customer: 'Eli' },
      { orderId: 60, customer: 'Fay' },
    ],
  },
]

export const CLUSTERED_CODE = [
  'leaf = findLeaf(clusteredIndex, key)',
  'if page is full: split page',
  'insert row in sorted key order',
  'for key in range [30, 55]:',
  '  read current data page sequentially',
  '  follow next-leaf pointer if needed',
  'return ordered rows',
]

function clonePages(pages) {
  return pages.map(page => ({
    ...page,
    keys: [...page.keys],
    rows: page.rows.map(row => ({ ...row })),
  }))
}

export function clusteredIndexSteps() {
  const pages = clonePages(CLUSTERED_PAGES)
  const steps = []
  const rangeResults = []

  steps.push({
    pages: clonePages(pages),
    leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
    action: 'init',
    focusPageId: null,
    focusKey: null,
    rangeResults: [],
    explanation: 'A clustered index keeps the data pages themselves ordered by the index key.',
    why: 'Because row order matches key order, nearby keys are also physically nearby on disk.',
    highlightLine: -1,
  })

  steps.push({
    pages: clonePages(pages),
    leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
    action: 'locate',
    focusPageId: 'C2',
    focusKey: 45,
    rangeResults: [],
    explanation: 'To insert key 45, the index routes us to data page C2.',
    why: 'Clustered indexes use the tree to find the correct physical page before touching the row data.',
    highlightLine: 0,
  })

  const left = {
    id: 'C2',
    keys: [40, 45],
    rows: [
      { orderId: 40, customer: 'Dev' },
      { orderId: 45, customer: 'Gia' },
    ],
  }
  const right = {
    id: 'C3',
    keys: [50, 60],
    rows: [
      { orderId: 50, customer: 'Eli' },
      { orderId: 60, customer: 'Fay' },
    ],
  }
  pages.splice(1, 1, left, right)
  steps.push({
    pages: clonePages(pages),
    leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
    action: 'split',
    focusPageId: 'C2',
    focusKey: 45,
    rangeResults: [],
    explanation: 'Page C2 was full, so inserting 45 triggered a page split into C2 and C3.',
    why: 'Clustered indexes preserve sorted physical order, but that means inserts can be more expensive when a full page must split.',
    highlightLine: 1,
  })

  steps.push({
    pages: clonePages(pages),
    leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
    action: 'insert',
    focusPageId: 'C2',
    focusKey: 45,
    rangeResults: [],
    explanation: 'Key 45 is now stored in sorted position within the clustered data pages.',
    why: 'The payoff is that future range scans can read rows in order without an extra sort.',
    highlightLine: 2,
  })

  const rangeRows = pages.flatMap(page => page.rows).filter(row => row.orderId >= 30 && row.orderId <= 55)
  for (const row of rangeRows) {
    rangeResults.push(row)
    const focusPageId = row.orderId <= 30 ? 'C1' : row.orderId <= 45 ? 'C2' : 'C3'
    steps.push({
      pages: clonePages(pages),
      leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
      action: 'range-scan',
      focusPageId,
      focusKey: row.orderId,
      rangeResults: rangeResults.map(item => ({ ...item })),
      explanation: `Range scan reads key ${row.orderId} directly from page ${focusPageId}.`,
      why: 'Ordered pages make range access mostly sequential, which is where clustered indexes shine.',
      highlightLine: row.orderId === 50 ? 5 : 4,
    })
  }

  steps.push({
    pages: clonePages(pages),
    leafKeys: pages.map(page => ({ pageId: page.id, keys: [...page.keys] })),
    action: 'done',
    focusPageId: null,
    focusKey: null,
    rangeResults: rangeResults.map(item => ({ ...item })),
    explanation: 'The clustered index returns the range [30, 55] in key order by walking adjacent pages.',
    why: 'This is why clustered indexes are excellent for range predicates and ORDER BY on the clustering key.',
    highlightLine: 6,
  })

  return steps
}
