module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^.+\\.(css|less|scss)$': 'identity-obj-proxy'
    },
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
      '^.+\\.jsx?$': 'babel-jest'
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverage: true,
    coverageReporters: ['text', 'lcov'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'scripts/**/*.{js,ts}',
      '!scripts/**/*.test.{js,ts}',
      '!scripts/**/__tests__/**/*',
      '!**/node_modules/**'
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
  };