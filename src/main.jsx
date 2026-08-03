import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { readTheme, applyTheme } from '@/lib/useTheme'

// Apply the saved theme synchronously before first render so every layout
// (including RaceCore, which doesn't mount ThemeToggle) starts in the
// correct theme and there's no dark flash on load.
applyTheme(readTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)