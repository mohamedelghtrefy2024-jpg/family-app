import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // BASE_URL نسبي (راجع vite.config.js: base: "./") عشان يشتغل صح سواء من
    // الجذر (سيرفر محلي) أو من مسار فرعي زي GitHub Pages.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // فشل تسجيل الـ Service Worker لا يمنع التطبيق من الشغل عاديًا أونلاين
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
