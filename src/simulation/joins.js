// Generates step-by-step comparisons of Nested Loop, Hash Join, Merge Join

export function joinSteps(outerRows, innerRows) {
  const nlSteps = nestedLoopSteps(outerRows, innerRows)
  const hjSteps = hashJoinSteps(outerRows, innerRows)
  const mjSteps = mergeJoinSteps(outerRows, innerRows)
  return { nlSteps, hjSteps, mjSteps }
}

function nestedLoopSteps(outer, inner) {
  const steps = []
  const results = []
  steps.push({ phase: 'init', outerRow: null, innerRow: null, results: [], comparisons: 0, explanation: 'Nested Loop Join: for each row in the outer table, scan the entire inner table.', highlightLine: 0 })

  let comparisons = 0
  for (const o of outer) {
    for (const i of inner) {
      comparisons++
      const match = o.id === i.userId
      if (match) results.push({ outer: o, inner: i })
      steps.push({
        phase: match ? 'match' : 'compare',
        outerRow: o, innerRow: i,
        results: [...results],
        comparisons,
        explanation: match
          ? `Match! Outer row ${o.id} joins with inner row (userId=${i.userId}).`
          : `No match: outer ${o.id} ≠ inner userId ${i.userId}. Moving to next inner row.`,
        highlightLine: match ? 3 : 2,
      })
    }
  }
  steps.push({ phase: 'done', outerRow: null, innerRow: null, results, comparisons, explanation: `Done. ${results.length} rows matched. Total comparisons: ${comparisons} (O(n×m)).`, highlightLine: 5 })
  return steps
}

function hashJoinSteps(outer, inner) {
  const steps = []
  const hashTable = {}
  const results = []

  steps.push({ phase: 'init', hashTable: {}, probeRow: null, results: [], comparisons: 0, explanation: 'Hash Join: Phase 1 — Build a hash table from the smaller (inner) table on the join key.', highlightLine: 0 })

  for (const i of inner) {
    if (!hashTable[i.userId]) hashTable[i.userId] = []
    hashTable[i.userId].push(i)
    steps.push({
      phase: 'build',
      hashTable: JSON.parse(JSON.stringify(hashTable)),
      probeRow: null, results: [], comparisons: 0,
      highlightRow: i,
      explanation: `Hashing inner row userId=${i.userId} → bucket [${i.userId}].`,
      highlightLine: 1,
    })
  }

  steps.push({ phase: 'probe-start', hashTable: JSON.parse(JSON.stringify(hashTable)), probeRow: null, results: [], comparisons: 0, explanation: 'Phase 2 — Probe: for each outer row, look up its join key in the hash table. O(1) per lookup.', highlightLine: 3 })

  let comparisons = 0
  for (const o of outer) {
    comparisons++
    const bucket = hashTable[o.id] ?? []
    const matches = bucket
    matches.forEach(m => results.push({ outer: o, inner: m }))
    steps.push({
      phase: matches.length ? 'match' : 'miss',
      hashTable: JSON.parse(JSON.stringify(hashTable)),
      probeRow: o, results: [...results], comparisons,
      explanation: matches.length
        ? `Probe outer id=${o.id} → bucket [${o.id}] has ${matches.length} row(s). Join found!`
        : `Probe outer id=${o.id} → bucket [${o.id}] empty. No match.`,
      highlightLine: matches.length ? 5 : 4,
    })
  }
  steps.push({ phase: 'done', hashTable: JSON.parse(JSON.stringify(hashTable)), probeRow: null, results, comparisons, explanation: `Done. ${results.length} matches. Hash join cost: O(n+m).`, highlightLine: 6 })
  return steps
}

function mergeJoinSteps(outer, inner) {
  const sortedOuter = [...outer].sort((a, b) => a.id - b.id)
  const sortedInner = [...inner].sort((a, b) => a.userId - b.userId)
  const steps = []
  const results = []

  steps.push({ phase: 'init', sortedOuter, sortedInner, i: 0, j: 0, results: [], explanation: 'Merge Join: Both tables must be sorted on the join key first. Then two pointers sweep through simultaneously.', highlightLine: 0 })

  let i = 0, j = 0
  while (i < sortedOuter.length && j < sortedInner.length) {
    const o = sortedOuter[i]
    const inn = sortedInner[j]
    if (o.id === inn.userId) {
      results.push({ outer: o, inner: inn })
      steps.push({ phase: 'match', sortedOuter, sortedInner, i, j, results: [...results], explanation: `Match at i=${i}, j=${j}: outer id=${o.id} = inner userId=${inn.userId}.`, highlightLine: 3 })
      j++
    } else if (o.id < inn.userId) {
      steps.push({ phase: 'advance-outer', sortedOuter, sortedInner, i, j, results: [...results], explanation: `outer[${i}].id (${o.id}) < inner[${j}].userId (${inn.userId}) → advance outer pointer.`, highlightLine: 4 })
      i++
    } else {
      steps.push({ phase: 'advance-inner', sortedOuter, sortedInner, i, j, results: [...results], explanation: `outer[${i}].id (${o.id}) > inner[${j}].userId (${inn.userId}) → advance inner pointer.`, highlightLine: 5 })
      j++
    }
  }
  steps.push({ phase: 'done', sortedOuter, sortedInner, i, j, results, explanation: `Done. ${results.length} matches. Merge join cost: O(n+m) after sort O(n log n + m log m).`, highlightLine: 7 })
  return steps
}

export const DEFAULT_OUTER = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Carol' },
  { id: 4, name: 'Dave' },
]

export const DEFAULT_INNER = [
  { userId: 2, order: 'Laptop',  amount: 999 },
  { userId: 1, order: 'Mouse',   amount: 29  },
  { userId: 3, order: 'Keyboard',amount: 79  },
  { userId: 2, order: 'Monitor', amount: 349 },
  { userId: 5, order: 'Webcam',  amount: 59  },
]

export const NL_CODE = [
  'for each outer_row in Outer:',
  '  for each inner_row in Inner:',
  '    if outer_row.id == inner_row.userId:',
  '      emit(outer_row, inner_row)',
  '  end for',
  'end for   // cost: O(n × m)',
]

export const HJ_CODE = [
  '-- Phase 1: Build',
  'for each inner_row in Inner:',
  '  hashTable[inner_row.userId].add(inner_row)',
  '-- Phase 2: Probe',
  'for each outer_row in Outer:',
  '  if outer_row.id not in hashTable: skip',
  '  for match in hashTable[outer_row.id]: emit()',
  '-- cost: O(n + m)',
]

export const MJ_CODE = [
  'sort Outer by join_key   // O(n log n)',
  'sort Inner by join_key   // O(m log m)',
  'i=0; j=0',
  'if outer[i].id == inner[j].userId: emit(); j++',
  'elif outer[i].id < inner[j].userId: i++',
  'elif outer[i].id > inner[j].userId: j++',
  'repeat until i>=n or j>=m',
  '// cost: O(n + m) after sort',
]
