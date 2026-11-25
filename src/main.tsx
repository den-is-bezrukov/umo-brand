import React, { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './index.css'
import { COUNTER } from './ui/metrika'
import { MATERIALS } from './data/materials'

// Pages are split so the guide doesn't download the PDF renderer the price card needs.
const App = lazy(() => import('./App'))
const Guide = lazy(() => import('./guide/Guide'))
const Livery = lazy(() => import('./Livery'))
const PlateFrame = lazy(() => import('./PlateFrame'))
const NameTag = lazy(() => import('./NameTag'))
const BusinessCard = lazy(() => import('./BusinessCard'))
const PriceTag = lazy(() => import('./PriceTag'))
const HoursSign = lazy(() => import('./HoursSign'))
const Memo = lazy(() => import('./Memo'))
// A `pdf=1` link may name the point loosely; the page finds it, asking which when there are several
const LinkPoint = lazy(() => import('./ui/LinkPoint'))

// Yandex.Metrika (index.html, the brand's domain only) is set to `defer`, as Metrika asks of a single-page site: a view is
// sent here, once per page. Only a new path counts: the generators rewrite the query with every setting changed, the
// guide the hash with every section scrolled to. Sent a tick later, so a redirect (an unknown path) counts once.
let lastHit = ''
let lastHref: string = (window as any).siteReferrer ?? document.referrer
function MetrikaHits() {
  const { pathname } = useLocation()
  useEffect(() => {
    const timer = setTimeout(() => {
      const ym = (window as any).ym
      if (!ym || location.pathname === lastHit) return
      ym(COUNTER, 'hit', location.href, { referer: lastHref })
      lastHit = location.pathname
      lastHref = location.href
    })
    return () => clearTimeout(timer)
  }, [pathname])
  return null
}

/** A generator's route, if the brand has it (`MATERIALS`) */
const has = (path: string) => MATERIALS.some(g => g.path === path)

/**
 * `data-editor` on the page while a generator is open, so it's set in the brand's interface type (`src/index.css`);
 * the guide, `/editor`'s window too, in the brand's own. Set before the first paint and with every path
 */
const markEditor = (pathname: string) => document.documentElement.toggleAttribute('data-editor', has(pathname))
markEditor(location.pathname)
function EditorType() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { markEditor(pathname) }, [pathname])
  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MetrikaHits />
      <EditorType />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Guide />} />
          {has('/price-card') && <Route path="/price-card" element={<App />} />}
          {has('/livery') && <Route path="/livery" element={<LinkPoint param="top" withPrefix><Livery /></LinkPoint>} />}
          {has('/plate-frame') && <Route path="/plate-frame" element={<LinkPoint param="name"><PlateFrame /></LinkPoint>} />}
          {has('/name-tag') && <Route path="/name-tag" element={<NameTag />} />}
          {has('/business-card') && <Route path="/business-card" element={<LinkPoint><BusinessCard /></LinkPoint>} />}
          {has('/price-tag') && <Route path="/price-tag" element={<LinkPoint><PriceTag /></LinkPoint>} />}
          <Route path="/editor" element={<Guide />} />
          {has('/hours-sign') && <Route path="/hours-sign" element={<LinkPoint param="name"><HoursSign /></LinkPoint>} />}
          {has('/memo') && <Route path="/memo" element={<Memo />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
