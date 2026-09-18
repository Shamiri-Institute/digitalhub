import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import plugin from "#/lint/hooks-policy.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester();

tester.run("hooks-policy/justify", plugin.rules.justify, {
  valid: [
    "// memo: sorting 5k rows on every keystroke was measured at 40ms\nconst rows = useMemo(() => sort(data), [data]);",
    "// callback: passed to a memoized child that compares props\nconst onClick = useCallback(() => {}, []);",
    "// effect: subscribes to window resize\nuseEffect(() => {}, []);",
    "// memo: identity must be stable across renders\nconst v = React.useMemo(() => 1, []);",
    {
      code: "const rows = useMemo(() => sort(data), [data]);",
      options: [{ hooks: ["useEffect"] }],
    },
  ],
  invalid: [
    { code: "const rows = useMemo(() => sort(data), [data]);", errors: [{ messageId: "missing" }] },
    { code: "// unrelated comment\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "// memo:\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "// memo: too far away\n\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "useEffect(() => {}, []);", errors: 1 },
    { code: "const f = React.useCallback(() => {}, []);", errors: 1 },
  ],
});
