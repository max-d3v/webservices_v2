/** @type {import('ts-jest').JestConfigWithTsJest} **/



module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  setupFiles: ['<rootDir>/dist/src/config.js'],
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};