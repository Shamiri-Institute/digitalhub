# AGENTS.md

Instructions for coding agents working in this repository. The full project guide is in `CLAUDE.md`; read it first. This file repeats the rules that agents most often get wrong.

## React Hooks Policy

**`useEffect` is considered harmful unless there is a proper justification.**

- Do not add a `useEffect` for work that a user event starts. Put it in the handler: `onClick`, `onOpenChange`, `onSubmit`.
- Do not add a `useEffect` to derive state from props or other state. Compute the value during render.
- Do not add a `useEffect` to fetch data that a Server Component or a server action can supply.
- A `useEffect` is acceptable only for a real external subscription: a DOM listener, a timer, a third-party widget, or a sync with something outside React. Put a one-line comment directly above it that states the reason.
- Do not add `useMemo` or `useCallback` unless a measurement or an obvious hot path shows a benefit. Say why in the PR. A lint rule whose only remedy is memoization is not enforced.
- oxlint enforces this through the `hooks-policy/justify` rule in `lint/hooks-policy.mjs`. Every `useMemo` and `useCallback` needs a comment on the line directly above it that starts with `memo:` or `callback:` and states the reason. `useEffect` gets the same treatment with `effect:` when ENG-2140 finishes. The lint fails otherwise, so prefer removing the hook to inventing a reason.

## Quality gates

Run these before you report a task as complete. All must pass.

```bash
npm run typecheck
npm run stylecheck   # oxfmt --check && oxlint --type-aware
npm run lint         # ESLint, Next.js rules
```

## Tooling

- Package manager: npm only.
- Formatter: oxfmt. Linter: oxlint with type-aware rules, plus ESLint for Next.js rules.
- Styling: Tailwind CSS classes only. No inline `style`, no new CSS files.
- Components: reuse `components/ui` and `components/common` before creating anything new.
- Commits: Conventional Commits, with the Linear ticket ID in the message.
