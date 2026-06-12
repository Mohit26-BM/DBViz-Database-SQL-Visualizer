// B+ Tree of order t: nodes hold 1..2t-1 keys; leaves store all data; internal nodes route
export const ORDER = 2  // min keys per non-root node

class BPlusNode {
  constructor(isLeaf = true) {
    this.keys = []
    this.children = []  // for internal nodes
    this.values = []    // for leaf nodes (same index as keys)
    this.next = null    // leaf linked list
    this.isLeaf = isLeaf
    this.id = BPlusNode._id++
  }
}
BPlusNode._id = 0

class BPlusTree {
  constructor(order = ORDER) {
    this.t = order
    this.root = new BPlusNode(true)
  }

  _maxKeys() { return 2 * this.t - 1 }

  // Return leaf node and path for a key
  _findLeafPath(key) {
    const path = []
    let node = this.root
    while (!node.isLeaf) {
      let i = 0
      while (i < node.keys.length && key >= node.keys[i]) i++
      path.push({ node, idx: i })
      node = node.children[i]
    }
    path.push({ node, idx: null })
    return path
  }

  insert(key) {
    const path = this._findLeafPath(key)
    const leaf = path[path.length - 1].node
    const pos = leaf.keys.findIndex(k => k >= key)
    if (pos === -1) {
      leaf.keys.push(key)
      leaf.values.push(key)
    } else if (leaf.keys[pos] === key) {
      return  // duplicate
    } else {
      leaf.keys.splice(pos, 0, key)
      leaf.values.splice(pos, 0, key)
    }
    this._splitIfNeeded(path)
  }

  _splitIfNeeded(path) {
    for (let i = path.length - 1; i >= 0; i--) {
      const { node } = path[i]
      if (node.keys.length <= this._maxKeys()) break

      const mid = Math.floor(node.keys.length / 2)
      const right = new BPlusNode(node.isLeaf)

      if (node.isLeaf) {
        right.keys = node.keys.splice(mid)
        right.values = node.values.splice(mid)
        right.next = node.next
        node.next = right
        const pushUpKey = right.keys[0]
        this._insertIntoParent(path, i, pushUpKey, right)
      } else {
        const pushUpKey = node.keys[mid]
        right.keys = node.keys.splice(mid + 1)
        node.keys.splice(mid)
        right.children = node.children.splice(mid + 1)
        this._insertIntoParent(path, i, pushUpKey, right)
      }
    }
  }

  _insertIntoParent(path, nodeIdx, key, rightChild) {
    if (nodeIdx === 0) {
      const newRoot = new BPlusNode(false)
      newRoot.keys = [key]
      newRoot.children = [path[0].node, rightChild]
      this.root = newRoot
    } else {
      const parent = path[nodeIdx - 1].node
      const pos = path[nodeIdx - 1].idx
      parent.keys.splice(pos, 0, key)
      parent.children.splice(pos + 1, 0, rightChild)
    }
  }

  search(key) {
    const path = this._findLeafPath(key)
    const leaf = path[path.length - 1].node
    const idx = leaf.keys.indexOf(key)
    return idx !== -1 ? { found: true, leaf, idx } : { found: false }
  }

  // Serialize entire tree for snapshot
  serialize() {
    const nodes = []
    const queue = [{ node: this.root, level: 0, parentId: null, childIdx: 0 }]
    while (queue.length) {
      const { node, level, parentId } = queue.shift()
      nodes.push({
        id: node.id, keys: [...node.keys], isLeaf: node.isLeaf,
        level, parentId,
        childIds: node.isLeaf ? [] : node.children.map(c => c.id),
        nextId: node.next?.id ?? null,
      })
      if (!node.isLeaf) {
        node.children.forEach((c, i) => queue.push({ node: c, level: level + 1, parentId: node.id, childIdx: i }))
      }
    }
    return nodes
  }
}

export function bPlusTreeSteps(keys) {
  BPlusNode._id = 0
  const tree = new BPlusTree(ORDER)
  const steps = []

  steps.push({
    tree: tree.serialize(),
    action: 'init',
    key: null,
    highlightNodeIds: [],
    explanation: 'Empty B+ tree. Order 2 means each non-root node holds 1–3 keys. Leaves hold all data and form a linked list.',
    why: 'B+ trees guarantee O(log n) search, insert, and delete because every path from root to leaf has the same length.',
    highlightLine: 0,
  })

  for (const key of keys) {
    // Search path steps
    const pathBefore = tree._findLeafPath(key)
    const pathIds = pathBefore.map(p => p.node.id)

    steps.push({
      tree: tree.serialize(),
      action: 'search',
      key,
      highlightNodeIds: pathIds,
      explanation: `Searching for insertion point of key ${key}. Traversing from root → leaf following the routing keys.`,
      why: 'Internal nodes in a B+ tree only store routing keys (copies of separator values). We always end up at a leaf.',
      highlightLine: 1,
    })

    const leafBefore = pathBefore[pathBefore.length - 1].node
    steps.push({
      tree: tree.serialize(),
      action: 'found-leaf',
      key,
      highlightNodeIds: [leafBefore.id],
      explanation: `Found target leaf with keys [${leafBefore.keys.join(', ')}]. Inserting ${key} in sorted order.`,
      why: 'Leaf nodes store actual values. Keeping them sorted enables fast range scans via the next-leaf pointer.',
      highlightLine: 2,
    })

    tree.insert(key)
    const treeAfter = tree.serialize()
    const willSplit = treeAfter.length > steps[steps.length - 1].tree.length ||
                      treeAfter.some((n, i) => i < steps[steps.length - 1].tree.length && n.keys.length !== steps[steps.length - 1].tree[i]?.keys.length)

    steps.push({
      tree: treeAfter,
      action: willSplit ? 'split' : 'insert',
      key,
      highlightNodeIds: [],
      explanation: willSplit
        ? `Inserted ${key} caused a node overflow (> ${2 * ORDER - 1} keys). The node splits: left half stays, right half becomes a new node, and the first key of the right node is pushed up.`
        : `Inserted ${key} into the leaf. No overflow — node has ≤ ${2 * ORDER - 1} keys.`,
      why: willSplit
        ? 'Splitting maintains the B+ tree invariant: every non-root node has between t-1 and 2t-1 keys. The pushed-up key lets the parent route correctly.'
        : 'Sorted insertion with no structural change needed.',
      highlightLine: willSplit ? 4 : 3,
    })
  }

  return steps
}

export const BPLUS_CODE = [
  'function insert(tree, key):',
  '  leaf = findLeaf(tree.root, key)',
  '  insertSorted(leaf, key)',
  '  if leaf.keys.length <= maxKeys: return',
  '  splitNode(leaf, tree)         // overflow!',
  '',
  'function splitNode(node, tree):',
  '  mid = floor(node.keys.length / 2)',
  '  right = newNode(node.isLeaf)',
  '  right.keys = node.keys.splice(mid)',
  '  pushUp = right.keys[0]       // separator key',
  '  insertIntoParent(pushUp, right)',
  '  if parent overflows: splitNode(parent)',
]
