import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import plugin from "#/lint/hooks-policy.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester();
// The hooks .oxlintrc.json enables the justify rule for.
const REPO_HOOKS = ["useEffect", "useLayoutEffect", "useMemo", "useCallback"];

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
    {
      code: "// layouteffect: measures the trigger before paint\nuseLayoutEffect(() => {}, []);",
      options: [{ hooks: REPO_HOOKS }],
    },
  ],
  invalid: [
    { code: "const rows = useMemo(() => sort(data), [data]);", errors: [{ messageId: "missing" }] },
    { code: "// unrelated comment\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "// memo:\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "// memo: too far away\n\nconst rows = useMemo(() => 1, []);", errors: 1 },
    { code: "useEffect(() => {}, []);", errors: 1 },
    { code: "const f = React.useCallback(() => {}, []);", errors: 1 },
    {
      code: "// effect: measures the trigger before paint\nuseLayoutEffect(() => {}, []);",
      options: [{ hooks: REPO_HOOKS }],
      errors: 1,
    },
  ],
});

tester.run("hooks-policy/no-form-reset-in-effect", plugin.rules["no-form-reset-in-effect"], {
  valid: [
    "const onOpenChange = (open) => { if (open) form.reset(values); };",
    "function onCountyChange(county) { form.setValue('subCounty', ''); setValue('county', county); }",
    "// effect: subscribes to window resize\nuseEffect(() => { timer.start(); }, []);",
  ],
  invalid: [
    {
      code: "useEffect(() => { form.reset(values); }, [values]);",
      errors: [{ messageId: "inEffect" }],
    },
    { code: "useLayoutEffect(function () { form.setValue('a', 1); }, []);", errors: 1 },
    {
      code: "const { reset } = useForm();\nuseEffect(() => { reset(values); }, [values]);",
      errors: 1,
    },
    { code: "React.useEffect(() => { if (open) { setValue('a', 1); } }, [open]);", errors: 1 },
  ],
});
