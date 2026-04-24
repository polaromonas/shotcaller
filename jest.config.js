/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/test/mocks/expo-sqlite.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
};
