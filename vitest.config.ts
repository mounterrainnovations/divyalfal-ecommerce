import { configDefaults, defineConfig } from 'vitest/config';
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
    // The CMS seed's live-database tests need DIRECT_URL, the network and write to the
    // `cms_scratch` schema, so they are NOT part of the default, hermetic run. They have their
    // own script: `npm run test:seed` (see vitest.seed.config.ts). Excluded, not skipped.
    exclude: [...configDefaults.exclude, 'prisma/seed-cms.test.ts'],
  },
});
