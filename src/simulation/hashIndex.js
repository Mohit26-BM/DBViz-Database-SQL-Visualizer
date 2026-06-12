export const BUCKET_COUNT = 7

function cloneBuckets(buckets) {
  return buckets.map(chain => chain.map(entry => ({ ...entry })))
}

function pushStep(steps, buckets, details) {
  steps.push({ buckets: cloneBuckets(buckets), ...details })
}

function bucketFor(key, bucketCount) {
  return ((key % bucketCount) + bucketCount) % bucketCount
}

export function hashIndexSteps(keys, lookupKey, bucketCount = BUCKET_COUNT) {
  const buckets = Array.from({ length: bucketCount }, () => [])
  const steps = []

  pushStep(steps, buckets, {
    action: 'init', key: null, bucketIndex: null, chainIndex: null, highlightLine: 0,
    explanation: `Create ${bucketCount} empty buckets. This index resolves collisions with separate chaining.`,
    why: 'Hash indexes trade ordering for expected O(1) equality lookups.',
  })

  keys.forEach((key, rowId) => {
    const bucketIndex = bucketFor(key, bucketCount)
    pushStep(steps, buckets, {
      action: 'hash', key, bucketIndex, chainIndex: null, highlightLine: 2,
      explanation: `h(${key}) = ${key} mod ${bucketCount} = bucket ${bucketIndex}.`,
      why: 'The hash function maps a large key space into a fixed number of bucket addresses.',
    })

    buckets[bucketIndex].forEach((entry, chainIndex) => {
      pushStep(steps, buckets, {
        action: 'collision', key, bucketIndex, chainIndex, highlightLine: 4,
        explanation: `Bucket ${bucketIndex} already contains key ${entry.key}; follow the chain to preserve both entries.`,
        why: 'Different keys can produce the same bucket address. Chaining resolves the collision without relocating existing rows.',
      })
    })

    buckets[bucketIndex].push({ key, rowId: `R${rowId + 1}` })
    pushStep(steps, buckets, {
      action: 'insert', key, bucketIndex, chainIndex: buckets[bucketIndex].length - 1, highlightLine: 5,
      explanation: `Store index entry (${key} -> R${rowId + 1}) in bucket ${bucketIndex}.`,
      why: 'The index stores a compact search key and a pointer to the table row, not the entire record.',
    })
  })

  if (lookupKey !== null && Number.isFinite(lookupKey)) {
    const bucketIndex = bucketFor(lookupKey, bucketCount)
    pushStep(steps, buckets, {
      action: 'lookup-hash', key: lookupKey, bucketIndex, chainIndex: null, highlightLine: 8,
      explanation: `Lookup: h(${lookupKey}) selects bucket ${bucketIndex} directly.`,
      why: 'An equality lookup avoids scanning unrelated buckets.',
    })

    const chain = buckets[bucketIndex]
    let foundIndex = -1
    for (let i = 0; i < chain.length; i++) {
      const found = chain[i].key === lookupKey
      pushStep(steps, buckets, {
        action: found ? 'found' : 'probe', key: lookupKey, bucketIndex, chainIndex: i,
        result: found ? chain[i] : null, highlightLine: found ? 11 : 10,
        explanation: found
          ? `Found key ${lookupKey} at chain position ${i}: follow pointer ${chain[i].rowId}.`
          : `Chain entry ${chain[i].key} is not ${lookupKey}; inspect the next entry.`,
        why: found
          ? 'The bucket narrows the search, then an exact key comparison confirms the match.'
          : 'Collisions require key verification, so worst-case lookup depends on chain length.',
      })
      if (found) { foundIndex = i; break }
    }

    if (foundIndex === -1) {
      pushStep(steps, buckets, {
        action: 'not-found', key: lookupKey, bucketIndex, chainIndex: null, result: null, highlightLine: 12,
        explanation: `Key ${lookupKey} is not present in bucket ${bucketIndex}.`,
        why: 'After the selected chain is exhausted, the equality lookup can safely report no match.',
      })
    }
  }

  pushStep(steps, buckets, {
    action: 'done', key: null, bucketIndex: null, chainIndex: null, highlightLine: 13,
    explanation: `Hash index complete. ${keys.length} entries occupy ${bucketCount} buckets.`,
    why: 'Performance stays near O(1) when the hash function distributes keys evenly and chains remain short.',
  })

  return steps
}

export const HASH_INDEX_CODE = [
  'function insert(index, key, rowPointer):',
  '  bucketCount = index.buckets.length',
  '  bucket = hash(key) mod bucketCount',
  '  if bucket is not empty:',
  '    follow collision chain',
  '  bucket.append({ key, rowPointer })',
  '',
  'function find(index, key):',
  '  bucket = hash(key) mod bucketCount',
  '  for entry in bucket.chain:',
  '    if entry.key != key: continue',
  '    return entry.rowPointer',
  '  return NOT_FOUND',
  '// expected lookup cost: O(1)',
]
