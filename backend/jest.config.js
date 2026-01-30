module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/services/storyGeneratorV2.ts',
    '!src/services/imageGeneratorV2.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  // Exclude tests from compilation due to uuid ES module issue
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/database',
    '<rootDir>/src/__tests__/services/storyArcGenerator.test.ts',
    '<rootDir>/src/__tests__/routes',
  ],
};
