// B-tree insertion with minimum degree 2 (maximum 3 keys per node).
export const MIN_DEGREE = 2

class BTreeNode {
  static nextId = 0

  constructor(leaf = true) {
    this.id = BTreeNode.nextId++
    this.leaf = leaf
    this.keys = []
    this.children = []
  }
}

function serialize(root) {
  const nodes = []
  const queue = [{ node: root, level: 0 }]

  while (queue.length) {
    const { node, level } = queue.shift()
    nodes.push({
      id: node.id,
      keys: [...node.keys],
      isLeaf: node.leaf,
      level,
      childIds: node.children.map(child => child.id),
    })
    node.children.forEach(child => queue.push({ node: child, level: level + 1 }))
  }

  return nodes
}

function addStep(steps, root, details) {
  steps.push({ tree: serialize(root), ...details })
}

function splitChild(parent, childIndex) {
  const fullChild = parent.children[childIndex]
  const right = new BTreeNode(fullChild.leaf)
  const median = fullChild.keys[MIN_DEGREE - 1]

  right.keys = fullChild.keys.slice(MIN_DEGREE)
  fullChild.keys = fullChild.keys.slice(0, MIN_DEGREE - 1)

  if (!fullChild.leaf) {
    right.children = fullChild.children.slice(MIN_DEGREE)
    fullChild.children = fullChild.children.slice(0, MIN_DEGREE)
  }

  parent.keys.splice(childIndex, 0, median)
  parent.children.splice(childIndex + 1, 0, right)
  return { left: fullChild, right, median }
}

function insertNonFull(node, key, root, steps) {
  if (node.leaf) {
    let position = node.keys.length
    while (position > 0 && key < node.keys[position - 1]) position--
    node.keys.splice(position, 0, key)

    addStep(steps, root, {
      action: 'insert', key, highlightNodeIds: [node.id], highlightLine: 8,
      explanation: `Inserted ${key} into leaf [${node.keys.join(', ')}] in sorted order.`,
      why: 'A non-full B-tree node can accept the key without changing the height of the tree.',
    })
    return
  }

  let childIndex = node.keys.findIndex(existing => key < existing)
  if (childIndex === -1) childIndex = node.keys.length
  let child = node.children[childIndex]

  addStep(steps, root, {
    action: 'descend', key, highlightNodeIds: [node.id, child.id], highlightLine: 10,
    explanation: `At internal node [${node.keys.join(', ')}], follow child ${childIndex} for key ${key}.`,
    why: 'Each separator partitions the key space, so only one child can contain the insertion position.',
  })

  if (child.keys.length === 2 * MIN_DEGREE - 1) {
    const { left, right, median } = splitChild(node, childIndex)
    addStep(steps, root, {
      action: 'split', key, highlightNodeIds: [node.id, left.id, right.id], highlightLine: 12,
      explanation: `Child was full. Split it and promoted median ${median} into its parent.`,
      why: 'Splitting before descent guarantees that insertion always enters a non-full node and preserves B-tree occupancy rules.',
    })

    if (key > median) childIndex++
    child = node.children[childIndex]
  }

  insertNonFull(child, key, root, steps)
}

export function bTreeSteps(keys) {
  BTreeNode.nextId = 0
  let root = new BTreeNode(true)
  const steps = []
  const inserted = new Set()

  addStep(steps, root, {
    action: 'init', key: null, highlightNodeIds: [], highlightLine: 0,
    explanation: 'Start with one empty leaf. A degree-2 B-tree node can contain at most 3 keys.',
    why: 'Unlike a B+ tree, a B-tree stores records in both internal nodes and leaves.',
  })

  for (const key of keys) {
    if (inserted.has(key)) {
      addStep(steps, root, {
        action: 'duplicate', key, highlightNodeIds: [], highlightLine: 2,
        explanation: `Key ${key} already exists, so this unique index skips the duplicate.`,
        why: 'Unique indexes must reject or ignore duplicate search keys.',
      })
      continue
    }
    inserted.add(key)

    addStep(steps, root, {
      action: 'search', key, highlightNodeIds: [root.id], highlightLine: 1,
      explanation: `Begin insertion of ${key} at the root.`,
      why: 'B-tree insertion follows one root-to-leaf path, giving logarithmic height.',
    })

    if (root.keys.length === 2 * MIN_DEGREE - 1) {
      const oldRoot = root
      root = new BTreeNode(false)
      root.children = [oldRoot]
      const { left, right, median } = splitChild(root, 0)

      addStep(steps, root, {
        action: 'root-split', key, highlightNodeIds: [root.id, left.id, right.id], highlightLine: 5,
        explanation: `The root was full, so it split and median ${median} became the new root.`,
        why: 'A root split is the only operation that increases B-tree height; all leaves remain at the same depth.',
      })
    }

    insertNonFull(root, key, root, steps)
  }

  addStep(steps, root, {
    action: 'done', key: null, highlightNodeIds: [], highlightLine: 15,
    explanation: `B-tree complete with ${inserted.size} unique keys.`,
    why: 'Every node is sorted, every non-root node is at least half full, and every leaf is at the same depth.',
  })

  return steps
}

export const BTREE_CODE = [
  'function insert(tree, key):',
  '  search from tree.root',
  '  if key already exists: return',
  '  if root is full:',
  '    newRoot.children = [root]',
  '    splitChild(newRoot, 0)',
  '    tree.root = newRoot',
  '  insertNonFull(tree.root, key)',
  '    if node is leaf: insertSorted(key)',
  '    else:',
  '      child = chooseChild(node, key)',
  '      if child is full:',
  '        splitChild(node, child.index)',
  '        choose left or right child',
  '      insertNonFull(child, key)',
  '  // balanced height: O(log n)',
]
