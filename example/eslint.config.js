const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactDoctor = require('eslint-plugin-react-doctor');
const noIndexBarrel = require('../lib/eslint-rules/no-index-barrel');
const requireMemoizedComponentExport = require('../lib/eslint-rules/require-memoized-component-export');

const rnPerf = {
  meta: { name: 'rn-perf' },
  rules: {
    'no-index-barrel': noIndexBarrel,
    'require-memoized-component-export': requireMemoizedComponentExport,
  },
};

module.exports = defineConfig([
  expoConfig,
  reactDoctor.configs.recommended,
  reactDoctor.configs.next,
  reactDoctor.configs['react-native'],
  reactDoctor.configs['tanstack-query'],
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'rn-perf': rnPerf },
    rules: {
      'rn-perf/no-index-barrel': 'error',
      'rn-perf/require-memoized-component-export': 'error',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
