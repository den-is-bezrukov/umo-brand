import { Buffer } from 'buffer'
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/price-card" element={<App />} />
        {/* Temporary: umo.autos has only one page today. Once there's more
            than one, replace this with a real landing route. */}
        <Route path="/" element={<Navigate to="/price-card" replace />} />
        <Route path="*" element={null} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
