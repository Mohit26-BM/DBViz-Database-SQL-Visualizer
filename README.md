# Database SQL Visualizer

An interactive database systems simulator built with **Vite 8 + React 19**, **Tailwind CSS v4**, **Framer Motion**, and **React Router 7**.

This README is intentionally implementation-focused. It documents how the app is structured, how simulators are built, and how shared UI patterns are wired together.

---

## Tech Stack

| Layer | Library | Version |
| --- | --- | --- |
| Build | Vite | 8 |
| UI | React | 19 |
| Styling | Tailwind CSS v4 (`@theme`) | 4 |
| Animation | Framer Motion | 12 |
| Routing | React Router | 7 |
| AI explanations | Groq SDK | 1 |

---

## Project Structure

```text
src/
|-- features/
|   `-- simulations/
|       |-- core/                 # SimulationPlayer, DataTable, StatusBadge
|       |-- acid/
|       |-- bplustree/
|       |-- btree/
|       |-- clustered-index/
|       |-- deadlocks/
|       |-- external-sort/
|       |-- hash-aggregation/
|       |-- hash-index/
|       |-- heap-file/
|       |-- isolation-levels/
|       |-- joins/
|       |-- mvcc/
|       |-- normalization/
|       |-- query-plan/
|       |-- scan-comparison/
|       `-- sql-pipeline/
|-- components/
|   `-- shared/                   # Navbar, Controls, SimLayout, CodePanel, AIExplainer, SimHelp
|-- hooks/
|   `-- usePlayer.js              # Shared playback state machine
|-- simulation/                   # Pure JS step engines and static scenario data
|-- pages/                        # Home and fallback pages
|-- App.jsx                       # Route registry
`-- index.css                     # Theme tokens and global styles
```

---

## Core Patterns

### Step engines

Every time-based simulator is driven by a pure function in `src/simulation/`. The engine precomputes a `Step[]` array and React only renders the current snapshot.

Typical step shape:

```js
{
  explanation,
  why,
  highlightLine,
  ...visualState
}
```

Because all steps are generated up front:

- stepping backward is trivial
- pseudocode highlighting stays deterministic
- AI explanations can use a stable step payload
- simulator pages remain mostly presentational

### Feature wrapper pattern

Most pages use `src/features/simulations/core/SimulationPlayer.jsx`.

That wrapper owns:

- `usePlayer()` playback state
- transport controls
- paused-step AI explainer
- composition slots: `renderLeft`, `renderCenter`, `renderRight`

Pages only provide data entry, visualization, and page-specific explanation blocks.

### Shared layout pattern

`src/components/shared/SimLayout.jsx` provides the common shell:

- top toolbar with title, subtitle, accent bar, and help trigger
- optional left sidebar for controls and metadata
- main canvas for the simulation
- optional support panel rendered below the main canvas
- timeline / transport section at the bottom

The right-side code panel used earlier was moved below the visualizer so comparison pages can keep full horizontal space.

### Playback model

`src/hooks/usePlayer.js` stores:

- `steps`
- `currentStep`
- `playing`
- `speed`

`play()` advances with `setInterval`, `pause()` clears it, and `reset(newSteps)` atomically swaps in a fresh scenario. Pages that need synchronized multi-track playback, such as joins, bypass `usePlayer` and manage a custom shared cursor directly.

### Shared primitives

- `DataTable.jsx`: reusable table renderer with PK highlighting, row highlighting, and optional per-row status badges
- `StatusBadge.jsx`: compact semantic labels used for phase, cost, or result state
- `CodePanel.jsx`: numbered pseudocode panel keyed by `highlightLine`
- `AIExplainer.jsx`: on-demand Groq streaming explanation for the current paused step
- `SimHelp.jsx`: structured slide-over help panel fed by per-page section data

---

## Simulator Implementation Notes

### SQL Pipeline

Files:
`src/features/simulations/sql-pipeline/`
`src/simulation/sqlPipeline.js` via local engine re-export

Implementation:

- The engine emits one step per execution stage with a stage summary array, visible rows, row metadata, and highlighted SQL line.
- The page renders three synchronized regions from the same step: SQL banner, pipeline operator strip, and evidence table.
- Operator status chips are derived from `step.stages`, so the UI never recomputes execution state.

### Join Algorithms

Files:
`src/features/simulations/joins/`
`src/simulation/joins.js`

Implementation:

- `joinSteps()` generates three independent traces: nested loop, hash join, merge join.
- The page does not use `SimulationPlayer`; it runs a custom shared cursor so all three algorithms advance together.
- Each algorithm column maps the shared progress cursor to its own local step index.
- Final output is rendered as a comparison panel only when all three traces reach completion.

### Query Plan

Files:
`src/features/simulations/query-plan/`
`src/simulation/queryPlan.js`

Implementation:

- This is modeled as an optimizer walkthrough, not an executor trace.
- The engine returns discrete optimizer phases: parse, stats lookup, candidate enumeration, costing, and final plan selection.
- Candidate plans are stored directly in each step, including estimated rows, cost, and active choice.
- The chosen physical tree is represented as a flat node list with `level` indentation metadata for rendering.

### External Sort

Files:
`src/features/simulations/external-sort/`
`src/simulation/externalSort.js`

Implementation:

- The engine exposes the sort as staged snapshots rather than per-comparison animation.
- Each step carries four explicit regions: original input, current memory buffer, disk runs, and merged output.
- The page reuses a single tape-style renderer for all four regions to keep the run-generation and merge views visually consistent.

### Hash Aggregation

Files:
`src/features/simulations/hash-aggregation/`
`src/simulation/hashAggregation.js`

Implementation:

- The engine mutates an internal JS object keyed by group value, then snapshots it into displayable bucket arrays after each row.
- "new group" and "accumulate" are emitted as separate phases so bucket creation is visible independently from value updates.
- The page highlights the current input row and the active aggregate bucket from the same step payload.

### B+ Tree

Files:
`src/features/simulations/bplustree/`
`src/simulation/bplustree.js`

Implementation:

- The engine owns the actual tree structure and serializes it after every meaningful change.
- Each snapshot is converted into a flat node list with `level`, `childIds`, and `nextId` metadata.
- The page reconstructs the visual tree layout from serialized nodes rather than storing SVG coordinates in the engine.
- Insert, search, leaf discovery, and split are emitted as distinct user-facing actions.

### B-tree

Files:
`src/features/simulations/btree/`
`src/simulation/btree.js`

Implementation:

- Uses minimum degree `2` with explicit `splitChild()` and `insertNonFull()` helpers.
- Node IDs are generated in the engine so snapshots can animate consistently across steps.
- Root split and child split are separate actions, which makes the structural change visible in playback.
- Duplicate insertion is represented as a normal step instead of being silently ignored.

### Hash Index

Files:
`src/features/simulations/hash-index/`
`src/simulation/hashIndex.js`

Implementation:

- Uses separate chaining and stores `{ key, rowId }` index entries in bucket arrays.
- The engine emits hash computation, collision traversal, insert, lookup hash, probe, found, and not-found phases.
- The page renders bucket address blocks plus chain entries in a horizontally readable layout.
- Lookup result pointers are kept in the step payload so the sidebar can display them without extra derivation.

### Table Scan vs Index Scan

Files:
`src/features/simulations/scan-comparison/`
`src/simulation/scanComparison.js`

Implementation:

- The engine builds one combined step stream containing two parallel state objects: `tableScan` and `indexScan`.
- Each access path tracks current position, visited items, result set, read count, explanation, and pseudocode line.
- The page renders both paths side by side from the same step, so progress and final output stay directly comparable.

### Heap File

Files:
`src/features/simulations/heap-file/`
`src/simulation/heapFile.js`

Implementation:

- Heap pages are modeled as fixed-capacity slot arrays with `live`, `deleted`, or free states.
- A derived free-space map is recalculated into each snapshot instead of being stored as separate mutable state in React.
- The walkthrough is scripted around insert, sequential search, delete, and slot reuse so page-state transitions stay easy to inspect.

### Clustered Index

Files:
`src/features/simulations/clustered-index/`
`src/simulation/clusteredIndex.js`

Implementation:

- The engine stores ordered data pages directly, not just leaf keys.
- Each snapshot includes both page contents and a compact `leafKeys` strip for the top-level ordering visualization.
- Insert is shown as locate -> split -> sorted page state, followed by a range scan that appends rows to `rangeResults`.

### Isolation Levels / MVCC / ACID / Deadlocks

Files:
`src/features/simulations/isolation-levels/`
`src/features/simulations/mvcc/`
`src/features/simulations/acid/`
`src/features/simulations/deadlocks/`

Implementation:

- These follow the standard `SimulationPlayer` pattern.
- Engines encode transaction state, conflict state, and visibility snapshots directly into steps.
- Pages mostly compose status cards, mini tables, and explanation panels from those precomputed snapshots.

### Normalization

Files:
`src/features/simulations/normalization/`

Implementation:

- This page is navigation-based rather than timeline-based, so it uses `SimLayout` directly instead of `SimulationPlayer`.
- Static decomposition data and explanations are selected by current normal-form label.
- The page combines form selection, dependency display, issue list, and decomposed tables without a step engine.

---

## Routing

All routes are registered in `src/App.jsx`. The app is split by topic rather than by generic page type.

Implemented routes:

```text
/                                  -> Home
/data-structures/bplustree         -> B+ Tree
/data-structures/btree             -> B-tree
/data-structures/hash-index        -> Hash Index
/query-processing/sql-pipeline     -> SQL Pipeline
/query-processing/joins            -> Join Algorithms
/query-processing/query-plan       -> Query Plan
/storage/scan-comparison           -> Table Scan vs Index Scan
/storage/heap-file                 -> Heap File
/storage/clustered-index           -> Clustered Index
/transactions/isolation-levels     -> Isolation Levels
/transactions/mvcc                 -> MVCC
/transactions/deadlocks            -> Deadlocks
/transactions/acid                 -> ACID
/design/normalization              -> Normalization
/algorithms/external-sort          -> External Sort
/algorithms/hash-aggregation       -> Hash Aggregation
```

`Navbar.jsx` groups these routes into dropdown sections so the route surface can grow without turning the header into a flat link list.

---

## Theme

Theme tokens live in `src/index.css` using Tailwind v4 `@theme` variables:

```css
--color-db-bg:      #0F172A;
--color-db-surface: #1E293B;
--color-db-card:    #111827;
--color-db-border:  #334155;
--color-db-blue:    #3B82F6;
--color-db-purple:  #8B5CF6;
--color-db-green:   #22C55E;
--color-db-amber:   #F59E0B;
--color-db-red:     #EF4444;
--color-db-muted:   #64748B;
```

These tokens are used directly in utility classes like `bg-db-card`, `border-db-border`, and `text-db-muted`, so pages stay visually consistent without local color constants.

---

## Running Locally

```bash
npm install
npm run dev
npm run build
npm run preview
```

For AI explanations:

```env
VITE_GROQ_API_KEY=your_key_here
```

The key is read by `src/components/shared/AIExplainer.jsx` and used client-side through `groq-sdk`.
