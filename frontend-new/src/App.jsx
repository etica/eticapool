import React, { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Miners from './pages/Miners'
import MinerProfile from './pages/MinerProfile'
import Blocks from './pages/Blocks'
import Payments from './pages/Payments'
import Network from './pages/Network'

// Template imports — lazy-loaded, dev-only
const TemplateSelector = import.meta.env.DEV ? lazy(() => import('./templates/TemplateSelector')) : null;
const Template2 = import.meta.env.DEV ? lazy(() => import('./templates/template-2/Dashboard')) : null;
const Template2b = import.meta.env.DEV ? lazy(() => import('./templates/template-2b/Dashboard')) : null;
const Template2c = import.meta.env.DEV ? lazy(() => import('./templates/template-2c/Dashboard')) : null;
const Template2d = import.meta.env.DEV ? lazy(() => import('./templates/template-2d/Dashboard')) : null;
const Template2e = import.meta.env.DEV ? lazy(() => import('./templates/template-2e/Dashboard')) : null;
const Template2f = import.meta.env.DEV ? lazy(() => import('./templates/template-2f/Dashboard')) : null;
const Template11 = import.meta.env.DEV ? lazy(() => import('./templates/template-11/Dashboard')) : null;
const Template12 = import.meta.env.DEV ? lazy(() => import('./templates/template-12/Dashboard')) : null;
const Template13 = import.meta.env.DEV ? lazy(() => import('./templates/template-13/Dashboard')) : null;
const Template14 = import.meta.env.DEV ? lazy(() => import('./templates/template-14/Dashboard')) : null;
const Template15 = import.meta.env.DEV ? lazy(() => import('./templates/template-15/Dashboard')) : null;
const TemplateVig = import.meta.env.DEV ? lazy(() => import('./templates/template-vig/Dashboard')) : null;
const OverviewA = import.meta.env.DEV ? lazy(() => import('./templates/overview-a/Overview')) : null;
const OverviewB = import.meta.env.DEV ? lazy(() => import('./templates/overview-b/Overview')) : null;
const OverviewC = import.meta.env.DEV ? lazy(() => import('./templates/overview-c/Overview')) : null;
const OverviewD = import.meta.env.DEV ? lazy(() => import('./templates/overview-d/Overview')) : null;
const OverviewE = import.meta.env.DEV ? lazy(() => import('./templates/overview-e/Overview')) : null;
const Overview12 = import.meta.env.DEV ? lazy(() => import('./templates/overview-12/Overview')) : null;
const OverviewSelector = import.meta.env.DEV ? lazy(() => import('./templates/overview-selector/Overview')) : null;

function LayoutWrapper() {
  return <Layout />;
}

function DevFallback() {
  return <div style={{ color: '#6b7280', padding: '4rem', textAlign: 'center' }}>Loading...</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Production routes — wrapped in Layout */}
      <Route element={<LayoutWrapper />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/miners" element={<Miners />} />
        <Route path="/miner/:address/:worker" element={<MinerProfile />} />
        <Route path="/miner/:address" element={<MinerProfile />} />
        <Route path="/blocks" element={<Blocks />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/network" element={<Network />} />
      </Route>

      {/* Template routes — dev only */}
      {import.meta.env.DEV && (
        <>
          <Route path="/templates" element={<Suspense fallback={<DevFallback />}><TemplateSelector /></Suspense>} />
          <Route path="/templates/2" element={<Suspense fallback={<DevFallback />}><Template2 /></Suspense>} />
          <Route path="/templates/2b" element={<Suspense fallback={<DevFallback />}><Template2b /></Suspense>} />
          <Route path="/templates/2c" element={<Suspense fallback={<DevFallback />}><Template2c /></Suspense>} />
          <Route path="/templates/2d" element={<Suspense fallback={<DevFallback />}><Template2d /></Suspense>} />
          <Route path="/templates/2e" element={<Suspense fallback={<DevFallback />}><Template2e /></Suspense>} />
          <Route path="/templates/2f" element={<Suspense fallback={<DevFallback />}><Template2f /></Suspense>} />
          <Route path="/templates/11" element={<Suspense fallback={<DevFallback />}><Template11 /></Suspense>} />
          <Route path="/templates/12" element={<Suspense fallback={<DevFallback />}><Template12 /></Suspense>} />
          <Route path="/templates/13" element={<Suspense fallback={<DevFallback />}><Template13 /></Suspense>} />
          <Route path="/templates/14" element={<Suspense fallback={<DevFallback />}><Template14 /></Suspense>} />
          <Route path="/templates/15" element={<Suspense fallback={<DevFallback />}><Template15 /></Suspense>} />
          <Route path="/templates/vig" element={<Suspense fallback={<DevFallback />}><TemplateVig /></Suspense>} />
          <Route path="/templates/overview-a" element={<Suspense fallback={<DevFallback />}><OverviewA /></Suspense>} />
          <Route path="/templates/overview-b" element={<Suspense fallback={<DevFallback />}><OverviewB /></Suspense>} />
          <Route path="/templates/overview-c" element={<Suspense fallback={<DevFallback />}><OverviewC /></Suspense>} />
          <Route path="/templates/overview-d" element={<Suspense fallback={<DevFallback />}><OverviewD /></Suspense>} />
          <Route path="/templates/overview-e" element={<Suspense fallback={<DevFallback />}><OverviewE /></Suspense>} />
          <Route path="/templates/overview-12" element={<Suspense fallback={<DevFallback />}><Overview12 /></Suspense>} />
          <Route path="/templates/overview-selector" element={<Suspense fallback={<DevFallback />}><OverviewSelector /></Suspense>} />
        </>
      )}
    </Routes>
  )
}
