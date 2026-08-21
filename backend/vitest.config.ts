import { defineConfig } from 'vitest/config';

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
    },
  },
});
