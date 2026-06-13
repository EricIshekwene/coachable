/**
 * Vitest setup file for RTL (React Testing Library) tests in src/test/.
 *
 * Extends Vitest's expect with @testing-library/jest-dom matchers
 * (toBeInTheDocument, toHaveClass, toHaveValue, etc.).
 *
 * This file runs in each test file's own environment. For src/test/** files
 * the environment is 'jsdom', so the DOM matchers are available. For
 * admin/test/** files (node env) the matchers are registered but never called,
 * so there is no conflict.
 */
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
