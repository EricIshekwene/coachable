import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

/**
 * Vitest configuration. Merges from vite.config.js to inherit the React JSX
 * transform and other Vite plugins.
 *
 * Default environment is 'node' (matching the existing admin/test/ suite).
 * Individual test files that need jsdom declare it via a file-level docblock:
 *   // @vitest-environment jsdom
 * This is the same pattern used by admin/test/notificationsRetry.test.js.
 *
 * setupFiles runs in each file's own environment, so @testing-library/jest-dom
 * is only active in jsdom-env files where the DOM matchers are needed.
 */
export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.js'],
    /**
     * globals: true exposes describe/it/expect/afterEach etc. as global
     * identifiers so React Testing Library can auto-detect afterEach and
     * register its cleanup hook. Without this, renders bleed between tests.
     * Existing admin/test/ files that import explicitly from 'vitest' are
     * unaffected — explicit imports shadow the globals.
     */
    globals: true,
  },
}))
