// server/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
  setupFiles: ['<rootDir>/test/env.js'],
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.test.js'],
      moduleNameMapper: {
        '^pdfkit$': '<rootDir>/test/mocks/pdfkit.js',
      },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
      testTimeout: 30000,
      moduleNameMapper: {
        '^pdfkit$': '<rootDir>/test/mocks/pdfkit.js',
      },
    },
  ],
};