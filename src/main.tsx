import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mana-font/css/mana.min.css'
import '@fontsource/alegreya-sc/700.css'
import '@fontsource/alegreya-sc/800.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import '@fontsource/alegreya-sans/800.css'
import '@fontsource/source-serif-4/400.css'
import '@fontsource/source-serif-4/400-italic.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
