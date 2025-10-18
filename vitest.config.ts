import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/backend/src'),
      '@nestjs/common': path.resolve(
        __dirname,
        'packages/backend/src/stubs/nest-common',
      ),
      '@nestjs/jwt': path.resolve(
        __dirname,
        'packages/backend/src/stubs/nest-jwt',
      ),
      '@nestjs/schedule': path.resolve(
        __dirname,
        'packages/backend/src/stubs/nest-schedule',
      ),
      '@nestjs/event-emitter': path.resolve(
        __dirname,
        'packages/backend/src/stubs/nest-event-emitter',
      ),
    },
  },
})
