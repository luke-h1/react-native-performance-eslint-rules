'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'forbid index.ts barrel / folder-entry modules under src (defeats React Native bundle tree-shaking)',
    },
    schema: [],
    messages: {
      barrel:
        'No index.ts barrels - import from the absolute file path instead.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const segments = filename.split(/[\\/]/);
    const basename = segments[segments.length - 1];

    if (basename !== 'index.ts') {
      return {};
    }

    return {
      Program(node) {
        context.report({ node, messageId: 'barrel' });
      },
    };
  },
};
