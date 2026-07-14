import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/contract/**/*.test.{ts,tsx}', 'tests/roundtrip/**/*.test.{ts,tsx}', 'tests/perf/**/*.test.{ts,tsx}'],
    globals: true,
  },
})
