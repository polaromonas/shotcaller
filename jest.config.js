/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run in-band: the better-sqlite3-backed expo-sqlite mock races across
  // parallel workers on first native load, causing intermittent failures.
  maxWorkers: 1,
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/test/mocks/expo-sqlite.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
};
