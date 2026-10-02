import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // `json-summary` is what CI reads to print the number into the run summary;
      // the rest are for a human running this locally.
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      // Deliberately NO thresholds. The number is information for a reviewer — which code
      // arrived untested — not a bar to climb: a floor that must not fall is a standing
      // incentive to write tests that cannot fail, which the handbook forbids (ch. 12.8,
      // "coverage is not a virtue in itself; information is"). What it says here today is
      // worth acting on: the orchestrator, config and handlers sit at 86–100%, while the
      // five third-party strategies (email delivery, external AI, KMS, Redis queue,
      // fulltext search) and the Next.js integration have no test at all. Those are each a
      // thin wrapper over something we do not manage, so the cheap fix is faking the vendor
      // at its outer edge (ch. 12.2) — not a unit test written to move this percentage.
    },
  },
})
