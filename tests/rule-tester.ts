import { RuleTester as ESLintRuleTester } from "eslint";
import { RuleTester as OxlintRuleTester } from "oxlint/plugins-dev";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

for (const Tester of [ESLintRuleTester, OxlintRuleTester]) {
  Tester.describe = describe;
  Tester.it = it;
  Tester.itOnly = it.only;
}

type Tests = Parameters<ESLintRuleTester["run"]>[2];

// Runs the same cases through ESLint and oxlint so the rules stay compatible with both.
export function runRuleTests(name: string, rule: unknown, tests: Tests) {
  describe("eslint", () => {
    new ESLintRuleTester({
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    }).run(name, rule as never, tests);
  });

  describe("oxlint", () => {
    new OxlintRuleTester({ eslintCompat: true }).run(
      name,
      rule as never,
      tests as never,
    );
  });
}
