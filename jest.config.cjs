module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { useESM: true }
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Allow TypeScript files that import with .js extension to resolve during tests
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
