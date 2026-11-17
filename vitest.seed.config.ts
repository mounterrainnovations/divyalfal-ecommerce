// `npm run test:seed`: the CMS seed's LIVE-DATABASE tests (prisma/seed-cms.test.ts).
//
// REQUIRES `DIRECT_URL` (in the environment or in `.env`) and network access to the Supabase
// project. WRITES to the `cms_scratch` schema ONLY: the test forces `?schema=cms_scratch`,
// asserts `current_schema()` before any write, and wipes the schema when it finishes. It never
// touches `public`. Run it at every task gate; it is excluded from the default
// run (vitest.config.ts) so a contributor without database access can still run `npm test`.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['prisma/seed-cms.test.ts'],
  },
});
