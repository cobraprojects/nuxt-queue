import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.nuxt/',
        'playground/',
        'test/fixtures/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    onConsoleLog(log) {
      // Suppress Redis connection errors in test output
      if (log.includes('ReplyError') || log.includes('[request error]')) {
        return false
      }
    },
  },
})
