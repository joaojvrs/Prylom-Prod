import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    server: {
      port: 5500,
      host: '127.0.0.1',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      // Injeta process.env.API_KEY para o código Gemini que usa essa variável
      'process.env.API_KEY': JSON.stringify(env.API_KEY ?? ''),
    },
  }
})
