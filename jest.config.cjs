'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Clear mock call history between tests but keep implementations
  clearMocks: true,
  // Verbose output so each test name is visible
  verbose: true,
};
