# react-native-performance-eslint-rules

A set of performance aware ast-grep and eslint rules for building fast react native apps.

Most React Native performance problems don't come from one big mistake. They come from small patterns that look harmless in review and slowly but surely add up: an extra re-render here, a list that doesn't recycle there. These rules catch those patterns automatically so you don't have to remember them.

## Tooling

| Tool                                   | What it is                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ESLint](https://eslint.org)           | The standard JS/TS linter. Rules are JavaScript that walks the syntax tree of each file. Good for rules that need logic, e.g. "is this component exported _and_ not memoized". Our rules live in `lib/eslint-rules`.                                                                                                         |
| [ast-grep](https://ast-grep.github.io) | A fast structural search tool. These represent rules that are quite hard to represent in ESLint and also run very fast!. Our rules live in `lib/ast-grep-rules`.                                                                                                                                                             |
| [react-doctor](https://react.doctor)   | A scanner that checks a React codebase for common bugs and performance issues and gives it a score. Ships as a CLI (`react-doctor`) and an ESLint plugin (`eslint-plugin-react-doctor`) with presets for React Native, Next, TanStack etc. We use it alongside our own rules rather than reinventing what it already covers. |

## Rules at a glance

| Rule                                                                         | Tool     | Severity |
| ---------------------------------------------------------------------------- | -------- | -------- |
| [`no-index-barrel`](#no-index-barrel)                                        | ESLint   | error    |
| [`require-memoized-component-export`](#require-memoized-component-export)    | ESLint   | error    |
| [`no-inline-renderitem-tsx`](#no-inline-renderitem-tsx)                      | ast-grep | error    |
| [`no-react-native-flatlist-ts` / `-tsx`](#no-react-native-flatlist-ts---tsx) | ast-grep | error    |
| [`no-animated-layout-props-ts` / `-tsx`](#no-animated-layout-props-ts---tsx) | ast-grep | warning  |

All rules only apply to files under `src/`.

---

### `no-index-barrel`

**What it flags:** any `index.ts` file under `src/`.

**Why:** a "barrel" is an `index.ts` that re-exports everything in a folder so you can write `import { Button } from '@/components'`. While it's fine for library code (and quite convenient), in react-native apps importing _one_ thing from a barrel makes Metro load _every_ module the barrel touches. In React Native that means:

- slower startup, because more JS has to be parsed and evaluated before the first screen renders
- a bigger bundle, because tree-shaking can't reliably drop the unused exports
- accidental circular imports (which can lead to unexpected behavior when building your app for production)

```ts
// bad - src/components/index.ts
export * from "./Button";
export * from "./Card";

// bad - pulls in Card (and everything Card imports) too
import { Button } from "@/components";

// good - import straight from the absolute file path
import { Button } from "@/components/Button";
```

---

### `require-memoized-component-export`

**What it flags:** an exported component that takes props but isn't wrapped in `memo`.

**Why:** by default, when a parent re-renders, React re-renders _all_ of its children, even if their props didn't change. `memo` tells React to skip the re-render when props are the same. On mobile, where the JS thread is also busy handling touches and animations, those wasted renders lead to dropped frames. You can disable this rule if you're using [React Compiler](https://react.dev/reference/compiler) which automatically memoizes components for you.

Components with no props are skipped, since `memo` gives them nothing.

```tsx
// bad
export function Avatar({ uri }: Props) {
  return <Image source={{ uri }} />;
}

// good
function AvatarComponent({ uri }: Props) {
  return <Image source={{ uri }} />;
}

export const Avatar = memo(AvatarComponent);
```

`memo` only helps if the props are actually stable. Passing a new object or inline function every render (`style={{...}}`, `onPress={() => ...}`) breaks it

---

### `no-inline-renderitem-tsx`

**What it flags:** an inline arrow function or function expression passed to `renderItem`.

**Why:** an inline function is a brand new function on every render of the parent. The list sees that `renderItem` changed and can't reuse the rows it already rendered, so every visible row re-renders, even when the data didn't change. When working with lists, this will result in dropped frames and janky scrolling.

**solution** Move the render outside of the component or stabilise it: module scope if it needs nothing from the component, or `useCallback` if it does.

```tsx
// bad
<FlashList data={messages} renderItem={({ item }) => <Message item={item} />} />;

// good - module scope
const renderMessage = ({ item }: ListRenderItemInfo<Msg>) => <Message item={item} />;


const MyComponent = () => {
  return (
    <FlashList data={messages} renderItem={renderMessage} />;
  )
}

const MyComponent = () => {
  // good - needs component state
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<Msg>) => <Message item={item} onPress={onSelect} />,
    [onSelect],
  );

  return (
    <FlashList data={messages} renderItem={renderMessage} />;
  )
}

```

---

### `no-react-native-flatlist-ts` / `-tsx`

**What it flags:** importing `FlatList`, `SectionList` or `VirtualizedList` from `react-native`.

**Why:** the built in lists _virtualize_: as rows scroll off screen they're destroyed, and new rows are created as they scroll on. Mounting components is expensive, so fast scrolling shows blank areas and memory use climbs.

[FlashList](https://shopify.github.io/flash-list/) and [LegendList](https://legendapp.com/open-source/list/) _recycle_ instead: a row that scrolls off screen is reused for the next one coming in, just with new data/props passed in. Far fewer views get created, so scrolling is smoother and uses less memory. Both are close to drop-in replacements.

- **LegendList** for chat style lists (bottom anchored, items of varying height, prepending older messages)
- **FlashList** for everything else

I would recommend assesing FlashList vs LegendList on a case-by-case basis, as LegendList can be faster in some areas and FlashList might be faster in others.

```tsx
// bad
import { FlatList } from "react-native";

// good
import { FlashList } from "@shopify/flash-list";
import { LegendList } from "@legendapp/list";
```

---

### `no-animated-layout-props-ts` / `-tsx`

**What it flags:** layout properties (`width`, `height`, `top`, `left`, `margin*`, `padding*`, `flex*`, `gap`, `borderWidth`, `aspectRatio`...) returned from Reanimated's `useAnimatedStyle`.

**Why:** there are two kinds of style changes:

- **Layout** props change the size or position of an element _in the layout_. When one changes, Yoga (React Native's layout engine) has to recalculate the layout of that element and potentially its siblings and parents. Doing that on every animation frame (60-120 times a second) is expensive and drops frames.
- **Transform and opacity** are applied _after_ layout, as a visual effect. Nothing else on screen needs to move, so they're quite cheap to animate.

Most layout animations have a transform equivalent: a move becomes `translateX`/`translateY`, a resize becomes `scale`.

```tsx
// bad - relayout on every frame
const style = useAnimatedStyle(() => ({
  left: offset.value,
  height: size.value,
}));

// good - no relayout
const style = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value }, { scaleY: size.value / BASE_HEIGHT }],
}));
```

This is a warning rather than an error, because some animations genuinely need to flow (e.g. an accordion that pushes content below it down). For those, suppress with an inline `// ast-grep-ignore` comment. More detail in [this Reanimated discussion](https://github.com/software-mansion/react-native-reanimated/discussions/3211).

---

## Example

`example/` is an Expo app wired up with all of the above:

| Script                  | What it runs                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `bun run lint`          | ESLint (expo config, react-doctor presets, rules above) and ast-grep |
| `bun run lint:eslint`   | ESLint only                                                          |
| `bun run lint:ast-grep` | ast-grep only                                                        |
| `bun run doctor`        | react-doctor CLI scan                                                |
