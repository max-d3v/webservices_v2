/** @type {import('ts-jest').JestConfigWithTsJest} **/

const baseDir = "<rootDir>/src";
const baseTestDir = "<rootDir>/src/__tests__";

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  collectCoverage: true,
  collectCoverageFrom: [`${baseDir}/**/*.ts`],
  testMatch: [`${baseTestDir}/integrationTests/**/*.test.ts`],
  setupFiles: [`${baseTestDir}/config.ts`],
};