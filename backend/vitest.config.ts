import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// api.test.ts imports the real app.ts, which wires the default jsonStore
// singleton to whatever STORAGE_DIR is configured — without this, every test
// run wrote real project/user files into the developer's actual ./data
// directory (1000+ accumulated over repeated runs, confirmed and cleaned up
// during development). One fresh temp dir per test run, same idea as the
// GEMINI_API_KEY override below.
const testStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradion-vitest-storage-'));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Force GeminiClient to fall back to the mock adapter regardless of a real
    // key in the developer's local .env — tests must never make live Gemini
    // calls (network-flaky, burns quota, and makes pass/fail depend on the
    // runner's own API key/quota rather than on the code under test).
    env: {
      GEMINI_API_KEY: '',
      STORAGE_DIR: testStorageDir,
    },
  },
});
