import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.jsx'

window.addEventListener('error', (event) => {
  const message = String(event?.message || '');
  const stack = String(event?.error?.stack || '');
  if (message.includes("Cannot read properties of undefined (reading 'startTime')") && stack.includes('reportAllChanges')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider attribute="class" storageKey="ayedos_theme" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
