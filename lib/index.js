'use strict';

// Plugin entry shared by ESLint (`plugins`) and oxlint (`jsPlugins`).
module.exports = {
  meta: { name: 'rn-perf' },
  rules: {
    'no-index-barrel': require('./eslint-rules/no-index-barrel'),
    'require-memoized-component-export': require('./eslint-rules/require-memoized-component-export'),
  },
};
