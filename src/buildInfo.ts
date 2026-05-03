/**
 * Build information - automatically generated at build time
 * Helps verify the deployed version and detect cached builds
 */

// Default values - will be replaced at build time if git is available
const BUILD_COMMIT = import.meta.env.VITE_BUILD_COMMIT || 'unknown';
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString();

export const buildInfo = {
  version: `Build ${BUILD_COMMIT.substring(0, 7)}`,
  fullCommit: BUILD_COMMIT,
  timestamp: BUILD_TIMESTAMP,
  displayText: `v${BUILD_COMMIT.substring(0, 7)} | ${new Date(BUILD_TIMESTAMP).toLocaleDateString()} ${new Date(BUILD_TIMESTAMP).toLocaleTimeString()}`,
};

export default buildInfo;
