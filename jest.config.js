/** @type {import('ts-jest').JestConfigWithTsJest} **/

const baseDir = "<rootDir>/src";
const baseTestDir = "<rootDir>/src/__tests__";

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    `${baseDir}/**/*.ts`,
    `!${baseDir}/**/*.d.ts`,
    `!${baseDir}/**/*.test.ts`,
    `!${baseDir}/**/*.spec.ts`,
    `!${baseDir}/app/main.ts`,
    `!${baseDir}/app/primary-cluster.ts`
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    `${baseTestDir}/**/*.test.ts`,
    `${baseTestDir}/**/*.spec.ts`,
  ],
  setupFiles: [`${baseTestDir}/setup.ts`],
  testTimeout: 30000,
  verbose: true,
  bail: false,
  maxWorkers: 4
};