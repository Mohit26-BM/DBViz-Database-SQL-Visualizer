export const EXTERNAL_SORT_INPUT = [42, 8, 33, 17, 29, 4, 11, 25]

export const EXTERNAL_SORT_CODE = [
  'split input into memory-sized chunks',
  'sort each chunk in memory',
  'write sorted runs to disk',
  'open one buffer per run',
  'repeatedly output smallest front record',
  'write merged run back to disk',
  'repeat until one sorted run remains',
]

function runLabel(run) {
  return `[${run.join(', ')}]`
}

export function externalSortSteps() {
  const runA = [8, 17, 33, 42]
  const runB = [4, 11, 25, 29]
  const merged = [4, 8, 11, 17, 25, 29, 33, 42]

  return [
    {
      phase: 'input',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [42, 8, 33, 17],
      runs: [],
      output: [],
      highlightLine: 0,
      explanation: 'External sort starts by reading as many records as fit in memory.',
      why: 'When the relation is larger than RAM, the engine must sort in batches rather than all at once.',
    },
    {
      phase: 'run-1',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [...runA],
      runs: [runA],
      output: [],
      highlightLine: 2,
      explanation: `The first chunk is sorted in memory and written out as run ${runLabel(runA)}.`,
      why: 'Sorted runs are the basic currency of external sort. Every later merge step depends on them.',
    },
    {
      phase: 'run-2',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [...runB],
      runs: [runA, runB],
      output: [],
      highlightLine: 2,
      explanation: `The second chunk becomes run ${runLabel(runB)}.`,
      why: 'After run generation, the algorithm has transformed one unsorted file into several sorted subfiles on disk.',
    },
    {
      phase: 'merge-start',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [runA[0], runB[0]],
      runs: [runA, runB],
      output: [],
      highlightLine: 3,
      explanation: 'Merge phase opens both runs and keeps one front record from each in memory buffers.',
      why: 'Merging only needs a tiny working set compared with in-memory sorting.',
    },
    {
      phase: 'merge-progress',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [17, 25],
      runs: [runA, runB],
      output: [4, 8, 11],
      highlightLine: 4,
      explanation: 'The merge repeatedly emits the smallest front record, then refills from that run.',
      why: 'Because each run is already sorted, comparing only the front records is enough to preserve global order.',
    },
    {
      phase: 'done',
      input: [...EXTERNAL_SORT_INPUT],
      memory: [],
      runs: [merged],
      output: [...merged],
      highlightLine: 6,
      explanation: `One final run remains: ${runLabel(merged)}.`,
      why: 'Once only one run is left, the entire relation is globally sorted and ready for ORDER BY, merge join, or duplicate elimination.',
    },
  ]
}
