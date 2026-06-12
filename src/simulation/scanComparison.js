export const TABLE_ROWS = [
  { id: 101, dept: 'Sales',   salary: 72000, name: 'Ana' },
  { id: 102, dept: 'Eng',     salary: 95000, name: 'Ben' },
  { id: 103, dept: 'Support', salary: 61000, name: 'Cara' },
  { id: 104, dept: 'Eng',     salary: 99000, name: 'Dev' },
  { id: 105, dept: 'HR',      salary: 68000, name: 'Eli' },
  { id: 106, dept: 'Eng',     salary: 87000, name: 'Fay' },
  { id: 107, dept: 'Finance', salary: 91000, name: 'Gus' },
]

export const INDEX_ENTRIES = [
  { salary: 87000, rowId: 106 },
  { salary: 91000, rowId: 107 },
  { salary: 95000, rowId: 102 },
  { salary: 99000, rowId: 104 },
]

export const SCAN_CODE = {
  table: [
    'for each row in heapFile:',
    '  read row from page',
    '  if row.salary >= 90000:',
    '    emit row',
    'return results',
  ],
  index: [
    'leaf = findFirstKey(index, 90000)',
    'while leaf has keys >= 90000:',
    '  read matching row pointer',
    '  fetch heap row by rowId',
    '  emit row',
    'return results',
  ],
}

function cloneRows(rows) {
  return rows.map(row => ({ ...row }))
}

function stepBase() {
  return {
    tableRows: cloneRows(TABLE_ROWS),
    predicate: 'salary >= 90000',
    tableScan: {
      currentRowId: null,
      visitedRowIds: [],
      resultIds: [],
      reads: 0,
      status: 'idle',
      explanation: 'Table scan has not started yet.',
      highlightLine: -1,
    },
    indexScan: {
      currentSalary: null,
      visitedSalaries: [],
      resultIds: [],
      reads: 0,
      status: 'idle',
      explanation: 'Index scan has not started yet.',
      highlightLine: -1,
    },
  }
}

export function scanComparisonSteps() {
  const steps = []
  const tableVisited = []
  const tableResults = []
  const indexVisited = []
  const indexResults = []
  let indexReads = 0
  let tableReads = 0

  steps.push({
    ...stepBase(),
    phase: 'init',
    explanation: 'We compare a heap table scan with a secondary index scan for predicate salary >= 90000.',
    why: 'A table scan touches every row. An index scan jumps directly into the matching key range.',
  })

  for (const row of TABLE_ROWS) {
    tableReads++
    tableVisited.push(row.id)
    if (row.salary >= 90000) tableResults.push(row.id)

    const step = stepBase()
    step.phase = 'table'
    step.explanation = `Table scan inspects row ${row.id}. ${row.salary >= 90000 ? 'It matches the predicate.' : 'It does not match.'}`
    step.why = 'Sequential scans are simple and predictable, but they pay the cost of reading rows that will be discarded.'
    step.tableScan = {
      currentRowId: row.id,
      visitedRowIds: [...tableVisited],
      resultIds: [...tableResults],
      reads: tableReads,
      status: 'active',
      explanation: `Read row ${row.id} from the heap and evaluate salary >= 90000.`,
      highlightLine: row.salary >= 90000 ? 3 : 2,
    }
    step.indexScan = {
      currentSalary: null,
      visitedSalaries: [...indexVisited],
      resultIds: [...indexResults],
      reads: indexReads,
      status: 'waiting',
      explanation: 'Index scan has not begun yet.',
      highlightLine: -1,
    }
    steps.push(step)
  }

  const seekStep = stepBase()
  seekStep.phase = 'seek'
  seekStep.explanation = 'Index scan uses the B+ tree to seek to the first key >= 90000.'
  seekStep.why = 'The index narrows the search space before any heap tuples are fetched.'
  seekStep.tableScan = {
    currentRowId: null,
    visitedRowIds: [...tableVisited],
    resultIds: [...tableResults],
    reads: tableReads,
    status: 'done',
    explanation: 'Table scan has already completed after reading the entire table.',
    highlightLine: 4,
  }
  indexReads++
  seekStep.indexScan = {
    currentSalary: 91000,
    visitedSalaries: [],
    resultIds: [],
    reads: indexReads,
    status: 'active',
    explanation: 'Traverse root to leaf and position on the first qualifying salary key.',
    highlightLine: 0,
  }
  steps.push(seekStep)

  for (const entry of INDEX_ENTRIES.filter(item => item.salary >= 90000)) {
    indexVisited.push(entry.salary)
    indexResults.push(entry.rowId)
    indexReads += 2

    const step = stepBase()
    step.phase = 'index'
    step.explanation = `Index scan reads key ${entry.salary}, follows row pointer ${entry.rowId}, and returns the heap tuple.`
    step.why = 'Secondary indexes still need heap lookups, but only for rows that actually satisfy the predicate.'
    step.tableScan = {
      currentRowId: null,
      visitedRowIds: [...tableVisited],
      resultIds: [...tableResults],
      reads: tableReads,
      status: 'done',
      explanation: 'Table scan work is unchanged.',
      highlightLine: 4,
    }
    step.indexScan = {
      currentSalary: entry.salary,
      visitedSalaries: [...indexVisited],
      resultIds: [...indexResults],
      reads: indexReads,
      status: 'active',
      explanation: `Read index entry ${entry.salary} and fetch heap row ${entry.rowId}.`,
      highlightLine: 3,
    }
    steps.push(step)
  }

  steps.push({
    ...stepBase(),
    phase: 'done',
    explanation: 'Both access paths found the same four rows, but the index scan avoided visiting unrelated tuples.',
    why: 'The tradeoff depends on selectivity. Once many rows qualify, an index scan can lose its advantage because of random heap fetches.',
    tableScan: {
      currentRowId: null,
      visitedRowIds: [...tableVisited],
      resultIds: [...tableResults],
      reads: tableReads,
      status: 'done',
      explanation: 'Full table scan complete.',
      highlightLine: 4,
    },
    indexScan: {
      currentSalary: null,
      visitedSalaries: [...indexVisited],
      resultIds: [...indexResults],
      reads: indexReads,
      status: 'done',
      explanation: 'Index scan complete.',
      highlightLine: 5,
    },
  })

  return steps
}
