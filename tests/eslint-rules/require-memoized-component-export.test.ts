import rule from "../../lib/eslint-rules/require-memoized-component-export.js";
import { createRuleTester } from "../rule-tester";

const ruleTester = createRuleTester();

const filename = "src/components/Card.tsx";

ruleTester.run("require-memoized-component-export", rule, {
  valid: [
    // the sanctioned shape
    {
      filename,
      code: `
        function CardComponent({ title }: { title: string }) {
          return <Text>{title}</Text>;
        }

        export const Card = memo(CardComponent);
      `,
    },
    {
      filename,
      code: `
        const CardComponent = ({ title }: { title: string }) => <Text>{title}</Text>;

        export const Card = memo(CardComponent);
      `,
    },
    // type assertions around memo are unwrapped
    {
      filename,
      code: `
        function ListComponent<T>({ items }: { items: T[] }) {
          return <View>{items.length}</View>;
        }

        export const List = memo(ListComponent) as typeof ListComponent;
      `,
    },
    {
      filename,
      code: `
        function CardComponent(props: Props) {
          return <Text>{props.title}</Text>;
        }

        export const Card = memo(CardComponent)!;
      `,
    },
    // no props -> nothing to memoize against
    { filename, code: `export const Spinner = () => <ActivityIndicator />;` },
    {
      filename,
      code: `
        export function Spinner() {
          return <ActivityIndicator />;
        }
      `,
    },
    // PascalCase but no JSX -> not a component
    { filename, code: `export const Parse = (input: string) => input.trim();` },
    {
      filename,
      code: `
        export function Format(value: number) {
          return value.toFixed(2);
        }
      `,
    },
    { filename, code: `export const Colors = { primary: "#000" };` },
    { filename, code: `export const Config = createConfig({ debug: true });` },
    // not PascalCase -> hooks and helpers are ignored
    { filename, code: `export const useCard = (id: string) => <Text>{id}</Text>;` },
    { filename, code: `export const renderRow = (item: Item) => <Row item={item} />;` },
    // not exported
    {
      filename,
      code: `
        function Card({ title }: { title: string }) {
          return <Text>{title}</Text>;
        }
      `,
    },
    { filename, code: `const Card = ({ title }: { title: string }) => <Text>{title}</Text>;` },
    { filename, code: `export const { Card } = components;` },
    { filename, code: `export { Card } from "./Card";` },
    { filename, code: `export type CardProps = { title: string };` },

    // Known gaps, pinned so a refactor that closes them is a deliberate, visible change.
    // default exports are never checked
    {
      filename,
      code: `
        export default function Card({ title }: { title: string }) {
          return <Text>{title}</Text>;
        }
      `,
    },
    // local component exported by specifier
    {
      filename,
      code: `
        const Card = ({ title }: { title: string }) => <Text>{title}</Text>;
        export { Card };
      `,
    },
    // wrapped in something other than memo
    {
      filename,
      code: `export const Input = forwardRef((props: Props, ref) => <TextInput ref={ref} {...props} />);`,
    },
    // memo of an inline function or a differently-named component
    { filename, code: `export const Card = memo((props: Props) => <Text>{props.title}</Text>);` },
    {
      filename,
      code: `
        function Inner(props: Props) {
          return <Text>{props.title}</Text>;
        }

        export const Card = memo(Inner);
      `,
    },
  ],
  invalid: [
    {
      filename,
      code: `export const Card = ({ title }: { title: string }) => <Text>{title}</Text>;`,
      errors: [
        {
          message:
            'Export component "Card" as `export const Card = memo(CardComponent);` with a `CardComponent` implementation.',
          line: 1,
          column: 14,
        },
      ],
    },
    {
      filename,
      code: `
        export function Card({ title }: { title: string }) {
          return <Text>{title}</Text>;
        }
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Card" }, line: 2 }],
    },
    {
      filename,
      code: `
        export const Card = function ({ title }: { title: string }) {
          return <Text>{title}</Text>;
        };
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // exporting the inner implementation reports under the outer name
    {
      filename,
      code: `
        export function CardComponent({ title }: { title: string }) {
          return <Text>{title}</Text>;
        }
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // fragment
    {
      filename,
      code: `export const Card = (props: Props) => <>{props.children}</>;`,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // JSX nested inside the body, not the return value itself
    {
      filename,
      code: `
        export function List({ items }: { items: string[] }) {
          if (items.length === 0) {
            return null;
          }
          return items.map((item) => <Row key={item} label={item} />);
        }
      `,
      errors: [{ messageId: "requireMemo", data: { name: "List" } }],
    },
    // type assertion around the component
    {
      filename,
      code: `export const Card = ((props: Props) => <Text>{props.title}</Text>) as FC<Props>;`,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // React.memo is not the sanctioned `memo` import
    {
      filename,
      code: `
        function CardComponent(props: Props) {
          return <Text>{props.title}</Text>;
        }

        export const Card = React.memo(CardComponent);
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // memo of the wrong implementation when a CardComponent exists
    {
      filename,
      code: `
        function CardComponent(props: Props) {
          return <Text>{props.title}</Text>;
        }

        export const Card = memo(OtherComponent);
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Card" } }],
    },
    // one report per offending declarator
    {
      filename,
      code: `
        export const Title = (props: Props) => <Text>{props.title}</Text>,
          Subtitle = (props: Props) => <Text>{props.subtitle}</Text>;
      `,
      errors: [
        { messageId: "requireMemo", data: { name: "Title" } },
        { messageId: "requireMemo", data: { name: "Subtitle" } },
      ],
    },
    // only the unmemoized export is reported
    {
      filename,
      code: `
        function CardComponent(props: Props) {
          return <Text>{props.title}</Text>;
        }

        export const Card = memo(CardComponent);
        export const Badge = (props: Props) => <Text>{props.label}</Text>;
      `,
      errors: [{ messageId: "requireMemo", data: { name: "Badge" } }],
    },
  ],
});
