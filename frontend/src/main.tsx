import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Toaster } from '@/components/ui/sonner'
import './fonts.css'
import 'highlight.js/styles/github.css'
import './hljs-overrides.css'
import '@uiw/react-markdown-preview/markdown.css'
import './doc-markdown.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
      <Toaster position="bottom-right" richColors closeButton />
    </BrowserRouter>
  </React.StrictMode>,
)
