import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LangProvider } from './i18n'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <App clientId={CLIENT_ID} />
    </LangProvider>
  </StrictMode>,
)
