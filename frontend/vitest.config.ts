import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom so component tests can render; pure-logic tests don't mind it.
    environment: 'jsdom',
    // No globals: tests import describe/it/expect from 'vitest' explicitly, so
    // `npm run typecheck` resolves them without widening tsconfig's "types".
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    // Mirrors the "@/*" -> "./*" path mapping in tsconfig.json.
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
