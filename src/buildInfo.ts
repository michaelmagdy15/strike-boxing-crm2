/**
 * Build information - automatically generated at build time
 * Helps verify the deployed version and detect cached builds
 */

// Default values - will be replaced at build time if git is available
const BUILD_COMMIT = import.meta.env.VITE_BUILD_COMMIT || '919a3b2a3ed5aaed4ffd8960ef169dc5f9611d54';
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || '2026-05-03T20:00:00Z';

export const buildInfo = {
  version: `Build ${BUILD_COMMIT.substring(0, 7)}`,
  fullCommit: BUILD_COMMIT,
  timestamp: BUILD_TIMESTAMP,
  displayText: `v${BUILD_COMMIT.substring(0, 7)} | ${new Date(BUILD_TIMESTAMP).toLocaleDateString()} ${new Date(BUILD_TIMESTAMP).toLocaleTimeString()}`,
};

export default buildInfo;
