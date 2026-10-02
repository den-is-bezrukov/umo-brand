import { Buffer } from 'buffer'
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer

import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

// Pages are split so the guide doesn't download the PDF renderer the price card needs.
const App = lazy(() => import('./App'))
const Guide = lazy(() => import('./guide/Guide'))
const GolosGuide = lazy(() => import('./guide/GolosGuide'))
const Livery = lazy(() => import('./Livery'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Guide />} />
          <Route path="/golos" element={<GolosGuide />} />
          <Route path="/price-card" element={<App />} />
          <Route path="/livery" element={<Livery />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
