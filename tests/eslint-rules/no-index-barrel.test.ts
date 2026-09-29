import rule from '../../lib/eslint-rules/no-index-barrel.js';
import { runRuleTests } from '../rule-tester';

const barrel = "export * from './Button';\nexport * from './Card';";

runRuleTests('no-index-barrel', rule, {
  valid: [
    { code: barrel, filename: 'src/components/Button.ts' },
    { code: barrel, filename: 'src/components/index.tsx' },
    { code: barrel, filename: 'src/components/index.js' },
    { code: barrel, filename: 'src/components/index.test.ts' },
    { code: barrel, filename: 'src/components/index.d.ts' },
    { code: barrel, filename: 'src/components/reindex.ts' },
    { code: barrel, filename: 'src/index/Button.ts' },
  ],
  invalid: [
    {
      code: barrel,
      filename: 'src/components/index.ts',
      errors: [
        {
          message:
            'No index.ts barrels - import from the absolute file path instead.',
          line: 1,
          column: 1,
        },
      ],
    },
    {
      code: 'export const theme = { spacing: 4 };',
      filename: 'src/theme/index.ts',
      errors: [{ messageId: 'barrel' }],
    },
    {
      code: '',
      filename: 'src/empty/index.ts',
      errors: [{ messageId: 'barrel' }],
    },
    {
      code: barrel,
      filename: 'index.ts',
      errors: [{ messageId: 'barrel' }],
    },
    {
      code: barrel,
      filename: 'src\\components\\index.ts',
      errors: [{ messageId: 'barrel' }],
    },
  ],
});
