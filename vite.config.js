import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @ffmpeg/ffmpeg is no longer imported as an ES module.
  // The UMD bundle loads via a plain <script> tag from /public/ffmpeg/
  // so Vite's module pipeline never touches it or its internal worker.
  optimizeDeps: {
    exclude: ["@ffmpeg/util"],
  },
})
