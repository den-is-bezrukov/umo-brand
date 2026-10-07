import { Buffer } from 'buffer'
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer

import React, { lazy, Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'

// Pages are split so the guide doesn't download the PDF renderer the price card needs.
const App = lazy(() => import('./App'))
const Guide = lazy(() => import('./guide/Guide'))
const SansGuide = lazy(() => import('./guide/SansGuide'))
const Livery = lazy(() => import('./Livery'))
const PlateFrame = lazy(() => import('./PlateFrame'))
const NameTag = lazy(() => import('./NameTag'))
const BusinessCard = lazy(() => import('./BusinessCard'))

// Yandex.Metrika (index.html, umo.autos only) is set to `defer`, as Metrika asks of a single-page site: a view is
// sent here, once per page. Only a new path counts: the generators rewrite the query with every setting changed, the
// guide the hash with every section scrolled to. Sent a tick later, so a redirect (/golos, an unknown path) counts once.
let lastHit = ''
let lastHref = document.referrer
function MetrikaHits() {
  const { pathname } = useLocation()
  useEffect(() => {
    const timer = setTimeout(() => {
      const ym = (window as any).ym
      if (!ym || location.pathname === lastHit) return
      ym(113514674, 'hit', location.href, { referer: lastHref })
      lastHit = location.pathname
      lastHref = location.href
    })
    return () => clearTimeout(timer)
  }, [pathname])
  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MetrikaHits />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Guide />} />
          <Route path="/umo-sans" element={<SansGuide />} />
          <Route path="/golos" element={<Navigate to="/umo-sans" replace />} />
          <Route path="/price-card" element={<App />} />
          <Route path="/livery" element={<Livery />} />
          <Route path="/plate-frame" element={<PlateFrame />} />
          <Route path="/name-tag" element={<NameTag />} />
          <Route path="/business-card" element={<BusinessCard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
