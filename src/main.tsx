import { Buffer } from 'buffer'
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/price-card" element={<App />} />
        <Route path="*" element={null} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
