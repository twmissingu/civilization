import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.{spec,test}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/logic/**'],
      exclude: ['src/render/**', 'src/**/*.d.ts', 'src/main.tsx'],
      thresholds: { lines: 80, branches: 80, functions: 80, perFile: false },
    },
  },
});
