export const HEAP_INITIAL_PAGES = [
  {
    id: 'P1',
    capacity: 4,
    slots: [
      { key: 101, status: 'live' },
      { key: 102, status: 'live' },
      { key: 103, status: 'live' },
      null,
    ],
  },
  {
    id: 'P2',
    capacity: 4,
    slots: [
      { key: 201, status: 'live' },
      { key: 202, status: 'live' },
      null,
      null,
    ],
  },
  {
    id: 'P3',
    capacity: 4,
    slots: [null, null, null, null],
  },
]

export const HEAP_CODE = [
  'freePage = freeSpaceMap.firstPageWithSpace()',
  'append record into first free slot',
  'for each page in heapFile:',
  '  for each slot in page:',
  '    if slot.key == target: return row',
  'mark slot as deleted',
  'reuse deleted space on later insert',
]

function clonePages(pages) {
  return pages.map(page => ({
    ...page,
    slots: page.slots.map(slot => (slot ? { ...slot } : null)),
  }))
}

function freeSpaceMap(pages) {
  return pages.map(page => ({
    pageId: page.id,
    freeSlots: page.slots.filter(slot => !slot || slot.status !== 'live').length,
  }))
}

export function heapFileSteps() {
  const pages = clonePages(HEAP_INITIAL_PAGES)
  const steps = []

  steps.push({
    pages: clonePages(pages),
    fsm: freeSpaceMap(pages),
    action: 'init',
    targetKey: null,
    highlightPageId: null,
    highlightSlot: null,
    explanation: 'A heap file stores rows wherever free space exists. Pages are not ordered by key.',
    why: 'Heap files make inserts cheap because they avoid maintaining a sorted physical order.',
    highlightLine: -1,
  })

  steps.push({
    pages: clonePages(pages),
    fsm: freeSpaceMap(pages),
    action: 'choose-page',
    targetKey: 301,
    highlightPageId: 'P1',
    highlightSlot: 3,
    explanation: 'The free-space map points to page P1, which still has one free slot for key 301.',
    why: 'A free-space map prevents scanning every page just to find insert capacity.',
    highlightLine: 0,
  })

  pages[0].slots[3] = { key: 301, status: 'live' }
  steps.push({
    pages: clonePages(pages),
    fsm: freeSpaceMap(pages),
    action: 'insert',
    targetKey: 301,
    highlightPageId: 'P1',
    highlightSlot: 3,
    explanation: 'Key 301 is appended into the open slot on P1.',
    why: 'Heap insertion is usually O(1) once a page with free space is known.',
    highlightLine: 1,
  })

  const searchOrder = [
    ['P1', 0], ['P1', 1], ['P1', 2], ['P1', 3],
    ['P2', 0], ['P2', 1],
  ]
  for (const [pageId, slotIndex] of searchOrder) {
    const page = pages.find(item => item.id === pageId)
    const slot = page.slots[slotIndex]
    const found = slot?.key === 202
    steps.push({
      pages: clonePages(pages),
      fsm: freeSpaceMap(pages),
      action: found ? 'found' : 'scan',
      targetKey: 202,
      highlightPageId: pageId,
      highlightSlot: slotIndex,
      explanation: found
        ? 'The search finds key 202 in page P2.'
        : `Search checks ${pageId} slot ${slotIndex + 1} and keeps scanning.`,
      why: found
        ? 'Without an index, tuple lookup may require scanning many unrelated slots first.'
        : 'Heap files optimize writes, not point lookups.',
      highlightLine: found ? 4 : 3,
    })
    if (found) break
  }

  pages[1].slots[1] = { key: 202, status: 'deleted' }
  steps.push({
    pages: clonePages(pages),
    fsm: freeSpaceMap(pages),
    action: 'delete',
    targetKey: 202,
    highlightPageId: 'P2',
    highlightSlot: 1,
    explanation: 'Deleting key 202 marks its slot reusable instead of physically compacting the whole heap file.',
    why: 'Heap files often leave holes or tombstones until later cleanup to keep deletes cheap.',
    highlightLine: 5,
  })

  pages[1].slots[1] = { key: 302, status: 'live' }
  steps.push({
    pages: clonePages(pages),
    fsm: freeSpaceMap(pages),
    action: 'reuse',
    targetKey: 302,
    highlightPageId: 'P2',
    highlightSlot: 1,
    explanation: 'A later insert reuses the deleted slot on P2 for key 302.',
    why: 'Reusing freed space reduces fragmentation and avoids growing the file too quickly.',
    highlightLine: 6,
  })

  return steps
}
