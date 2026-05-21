import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from "path"
import { fileURLToPath } from "node:url"
 
 
import tailwindcss from "@tailwindcss/vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }, 
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res.headersSent) return

            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: false,
              message: 'Backend API is not running on http://127.0.0.1:3000. Start sacco-backend with npm run dev or npm start.',
              error: err.code || 'PROXY_ERROR',
              path: req.url,
              timestamp: new Date().toISOString(),
            }))
          })
        },
      },
    },
  },
})
