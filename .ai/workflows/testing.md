---
name: "testing"
description: "Run the full test pipeline (unit, integration, API contract, Playwright E2E), coverage report and bug reports. Use when verifying a phase or before deployment."
---

# Testing Workflow

> Status tracking: QA tasks are updated with `node .ai/scripts/status-manager.js update-task <ID> status <STATUS>` and failures with `retry`. Test files live next to the code they test (see layout below) so decoupled backend/frontend repos stay self-contained.

## Identity
- **Name**: Testing Workflow
- **Trigger**: Backend and frontend tasks completed for current phase
- **Owner**: QA Agent (orchestrated by Super Agent)

## Flow

```
┌─────────────────────────┐
│  1. ENVIRONMENT SETUP    │
│  Verify test databases   │
│  Clear test data         │
│  Seed required fixtures  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  2. UNIT TESTS           │
│  npm run test:unit       │
│  -- --coverage           │
│  Target: ≥80% coverage  │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [PASS]          [FAIL]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Generate bug     │
     │     │ reports for each │
     │     │ failing test     │
     │     │ Send to Super    │
     │     │ Agent for retry  │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│  3. INTEGRATION TESTS    │
│  npm run test:e2e        │
│  Test API endpoints      │
│  with real database      │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [PASS]          [FAIL]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Generate bug     │
     │     │ reports           │
     │     │ Identify failing │
     │     │ endpoints         │
     │     │ Send to Super    │
     │     │ Agent            │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│  4. API CONTRACT TESTS   │
│  Validate all endpoints  │
│  against OpenAPI spec    │
│  Test error responses    │
│  Test rate limiting      │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [PASS]          [FAIL]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Log contract     │
     │     │ violations        │
     │     │ Flag mismatches  │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│  5. E2E TESTS            │
│  npx playwright test     │
│  Test critical user      │
│  journeys through UI     │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [PASS]          [FAIL]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Capture failing  │
     │     │ screenshots      │
     │     │ Record traces    │
     │     │ Generate reports │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│  6. COVERAGE REPORT      │
│  Generate coverage       │
│  summary                 │
│  Check against targets   │
│  Flag under-covered      │
│  modules                 │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  7. TEST SUMMARY         │
│  Compile results         │
│  List all bugs found     │
│  Report to Super Agent   │
└─────────────────────────┘
```

## Test Configuration

Run each suite from its own package (`codebase/backend`, `codebase/frontend`) so the same commands work in a monorepo and in decoupled repos.

### Jest Configuration (`codebase/backend`, unit tests — `npm run test:unit`)
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" },
  "collectCoverageFrom": ["**/*.(t|j)s", "!**/*.module.ts", "!**/main.ts"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "coverageThreshold": {
    "global": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

Integration/API tests use `codebase/backend/test/jest-e2e.json` (`rootDir: "."`, `testRegex: ".e2e-spec.ts$"`, same transform and `moduleNameMapper` with `<rootDir>/../src/$1`) via `npm run test:e2e`.

### Playwright Configuration (`codebase/frontend/playwright.config.ts`)
```typescript
{
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,
  workers: '50%',
  reporter: [['html', { open: 'never' }], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
}
```

## Success Criteria

| Metric | Minimum | Target |
|--------|---------|--------|
| Unit test pass rate | 100% | 100% |
| Integration test pass rate | 100% | 100% |
| E2E test pass rate | 95% | 100% |
| Line coverage | 80% | 90% |
| Branch coverage | 75% | 85% |
| Zero CRITICAL bugs | Required | Required |
| Zero HIGH bugs | Required | Required |
