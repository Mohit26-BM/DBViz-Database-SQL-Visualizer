import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/shared/Navbar'
import Home from './pages/Home'

// Feature-based simulation pages
import BPlusTreePage       from './features/simulations/bplustree/index'
import BTreePage           from './features/simulations/btree/index'
import HashIndexPage       from './features/simulations/hash-index/index'
import ScanComparisonPage  from './features/simulations/scan-comparison/index'
import HeapFilePage        from './features/simulations/heap-file/index'
import ClusteredIndexPage  from './features/simulations/clustered-index/index'
import JoinAlgorithmsPage  from './features/simulations/joins/index'
import QueryPlanPage       from './features/simulations/query-plan/index'
import IsolationLevelsPage from './features/simulations/isolation-levels/index'
import ACIDPage            from './features/simulations/acid/index'
import MVCCPage            from './features/simulations/mvcc/index'
import DeadlocksPage       from './features/simulations/deadlocks/index'
import NormalizationPage   from './features/simulations/normalization/index'
import SQLPipelinePage     from './features/simulations/sql-pipeline/index'
import ExternalSortPage    from './features/simulations/external-sort/index'
import HashAggregationPage from './features/simulations/hash-aggregation/index'

import ComingSoon from './pages/ComingSoon'

function AppLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <>
      {!isHome && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Data Structures */}
        <Route path="/data-structures/bplustree" element={<BPlusTreePage />} />
        <Route path="/data-structures/btree"      element={<BTreePage />} />
        <Route path="/data-structures/hash-index" element={<HashIndexPage />} />

        {/* Query Processing */}
        <Route path="/query-processing/sql-pipeline" element={<SQLPipelinePage />} />
        <Route path="/query-processing/joins"        element={<JoinAlgorithmsPage />} />
        <Route path="/query-processing/query-plan"   element={<QueryPlanPage />} />

        {/* Storage */}
        <Route path="/storage/scan-comparison" element={<ScanComparisonPage />} />
        <Route path="/storage/heap-file"       element={<HeapFilePage />} />
        <Route path="/storage/clustered-index" element={<ClusteredIndexPage />} />

        {/* Transactions */}
        <Route path="/transactions/isolation-levels" element={<IsolationLevelsPage />} />
        <Route path="/transactions/mvcc"             element={<MVCCPage />} />
        <Route path="/transactions/deadlocks"        element={<DeadlocksPage />} />
        <Route path="/transactions/acid"             element={<ACIDPage />} />

        {/* Design & Algorithms */}
        <Route path="/design/normalization"        element={<NormalizationPage />} />
        <Route path="/algorithms/external-sort"    element={<ExternalSortPage />} />
        <Route path="/algorithms/hash-aggregation" element={<HashAggregationPage />} />

        {/* 404 */}
        <Route path="*" element={<ComingSoon title="Page Not Found" category="404" />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
