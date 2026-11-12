/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Run in-band: better-sqlite3 is a native addon shared by every test file in
  // a process. (Its cross-file Error-realm quirk is handled in the mock.)
  maxWorkers: 1,
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/test/mocks/expo-sqlite.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
};
