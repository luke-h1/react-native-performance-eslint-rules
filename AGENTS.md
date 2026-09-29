# AGENTS.md

Performance lint rules for React Native, written as ESLint rules and ast-grep rules. `README.md` explains the reasoning behind each rule for humans. This file tells you how to write code that passes the rules, and how to work on the rules themselves.

## Layout

```
lib/eslint-rules/        ESLint rules (CommonJS, one rule per file)
lib/ast-grep-rules/      ast-grep rules (YAML, usually a -ts and -tsx pair per rule)
tests/eslint-rules/      vitest + RuleTester, one test file per rule
tests/ast-grep-rules/    ast-grep test cases (<rule-id>-test.yml) and __snapshots__/
sgconfig.yml             points ast-grep at the rule and test dirs
example/                 Expo app using every rule plus the react-doctor ESLint presets
```

## Commands

Root:

```bash
bun run test                                      # ESLint rule tests (vitest)
example/node_modules/.bin/ast-grep test           # ast-grep rule tests + snapshots
```

In `example/`:

```bash
bun run lint            # ESLint + ast-grep
bun run lint:eslint     # ESLint only
bun run lint:ast-grep   # ast-grep only
bun run doctor          # react-doctor CLI scan
bun run typecheck
```

Run the tests for any rule you touch, and `bun run lint` in `example/` for any app code you touch.

## Rules

All rules only apply to files under `src/`. Fix the code, don't suppress the rule, unless the rule's own section below says suppressing is acceptable.

### `no-index-barrel` (ESLint, error)

Flags any `src/**/index.ts`. Barrels make Metro load every re-exported module, which slows startup and blocks tree-shaking.

- Don't create `index.ts` files. Import from the file that defines the thing: `@/components/Button`, not `@/components`.
- Only `index.ts` is flagged. `index.tsx`, `index.test.ts` and `index.d.ts` are allowed.

### `require-memoized-component-export` (ESLint, error)

Flags an exported PascalCase component that takes props and isn't wrapped in `memo`. Prevents re-renders when the parent re-renders with the same props.

Required shape:

```tsx
function AvatarComponent({ uri }: Props) {
  return <Image source={{ uri }} />;
}

export const Avatar = memo(AvatarComponent);
```

- The implementation is named `<Name>Component`, the export is `<Name>`.
- Components with no parameters are skipped. Don't add `memo` to them.
- `memo` is pointless if props change every render. Hoist constant objects and styles out of the component and wrap callbacks in `useCallback`.

### `no-inline-renderitem-tsx` (ast-grep, error)

Flags an inline arrow or function expression passed to `renderItem`. A new function every render makes the list re-render every visible row.

- Doesn't use component state: define the renderer at module scope.
- Uses component state or props: wrap it in `useCallback` with the right deps.

### `no-react-native-flatlist-ts` / `-tsx` (ast-grep, error)

Flags importing `FlatList`, `SectionList` or `VirtualizedList` from `react-native`. They destroy and recreate rows while scrolling; recycling lists reuse them.

- Chat-style lists (bottom anchored, variable height, prepending history): `LegendList` from `@legendapp/list`.
- Everything else: `FlashList` from `@shopify/flash-list`.
- Install with `bunx expo install <package>` in `example/`.

### `no-animated-layout-props-ts` / `-tsx` (ast-grep, warning)

Flags layout props (`width`, `height`, `top`/`left`/..., `margin*`, `padding*`, `flex*`, `gap`, `border*Width`, `aspectRatio`) returned from Reanimated's `useAnimatedStyle`. They force a Yoga relayout on every frame.

- Move: `transform: [{ translateX }, { translateY }]` instead of `top`/`left`/`margin`.
- Resize: `transform: [{ scale }]` / `scaleX` / `scaleY` instead of `width`/`height`.
- Fade: `opacity`.
- Only if the animation genuinely has to push other content around (e.g. an accordion), suppress with a `// ast-grep-ignore` comment on the line before and say why.

### react-doctor

`example/eslint.config.js` also enables the `eslint-plugin-react-doctor` presets. Treat those findings the same way: fix the underlying code instead of disabling the rule.

## Working on the rules

- Keep `README.md` in sync. Every rule has a row in "Rules at a glance" and its own section explaining why it exists, with bad and good examples.
- ESLint rule: add `lib/eslint-rules/<name>.js` with `meta.docs.description` and `meta.messages`, add `tests/eslint-rules/<name>.test.ts` using `createRuleTester` from `tests/rule-tester`, then register it in the `rnPerf` plugin in `example/eslint.config.js`.
- ast-grep rule: add a `-ts.yml` and `-tsx.yml` pair when the pattern can appear in both, with `message` (one line) and `note` (the why and the fix). Add `tests/ast-grep-rules/<id>-test.yml` with `valid` and `invalid` cases, then run `ast-grep test --update-all` to write snapshots and review them. `example/sgconfig.yml` picks up new rules automatically.
- Every test file must match a rule `id`. Delete tests and snapshots when you delete a rule.
