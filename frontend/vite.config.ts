import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Сборка без нативных бинарников (.node/.exe): esbuild и rollup подменены на WASM-версии
// через "overrides" в package.json — так проект запускается даже при блокировке
// неподписанных файлов политикой Windows (Smart App Control / App Control).
export default defineConfig({
  plugins: [react()],
})
