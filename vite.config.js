import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // مسار نسبي بدل مطلق: عشان التطبيق يشتغل صح سواء اتفتح من الجذر
  // (سيرفر محلي) أو من مسار فرعي زي GitHub Pages (username.github.io/repo/).
  base: "./",
  plugins: [react()],
})
