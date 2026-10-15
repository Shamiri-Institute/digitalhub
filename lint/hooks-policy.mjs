// oxlint JS plugin: every listed React hook call must carry a justification comment
// directly above it. The comment starts with the hook name minus "use", lower-cased,
// followed by a colon, e.g. `// memo: avoids re-sorting 5k rows on every keystroke`.
// Policy: CLAUDE.md > React Hooks Policy.

/**
 * @param {{ type: string; name?: string; property?: { type: string; name?: string } }} callee
 * @returns {string | null}
 */
function calleeName(callee) {
  if (callee.type === "Identifier") return callee.name ?? null;
  if (callee.type === "MemberExpression" && callee.property?.type === "Identifier") {
    return callee.property.name ?? null;
  }
  return null;
}

/** @type {import("oxlint/plugins-dev").Rule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "Require a justification comment above useEffect/useMemo/useCallback" },
    schema: [
      {
        type: "object",
        properties: { hooks: { type: "array", items: { type: "string" } } },
        additionalProperties: false,
      },
    ],
    messages: {
      missing:
        "`{{hook}}` needs a justification. Put `// {{prefix}}: <reason>` on the line above it, or remove the hook.",
    },
  },
  create(context) {
    const options = /** @type {{ hooks?: string[] } | undefined} */ (context.options[0]);
    const hooks = new Set(options?.hooks ?? ["useEffect", "useMemo", "useCallback"]);
    const { sourceCode } = context;
    return {
      CallExpression(node) {
        const callee = node.callee;
        const name = calleeName(callee);
        if (!name || !hooks.has(name)) return;
        const prefix = name.slice(3).toLowerCase();
        // The statement or declaration that owns this call, so the comment can sit above
        // `const x = useMemo(...)` as well as above a bare `useEffect(...)`.
        let owner = node;
        while (
          owner.parent &&
          !["ExpressionStatement", "VariableDeclaration", "ReturnStatement"].includes(
            owner.parent.type,
          )
        ) {
          owner = owner.parent;
        }
        const target = owner.parent ?? owner;
        const comments = sourceCode.getCommentsBefore(target);
        const last = comments.at(-1);
        const justified =
          last !== undefined &&
          target.loc.start.line - last.loc.end.line <= 1 &&
          new RegExp(`^\\s*${prefix}:\\s*\\S`).test(last.value);
        if (!justified) {
          context.report({ node: callee, messageId: "missing", data: { hook: name, prefix } });
        }
      },
    };
  },
};

const effectHooks = new Set(["useEffect", "useLayoutEffect", "useEffectEvent"]);

/** @type {import("oxlint/plugins-dev").Rule} */
const noFormResetInEffect = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow form.reset/setValue inside effects" },
    messages: {
      inEffect:
        "Reset or set form values in the handler that opens or changes the dialog, or render the form inside DialogContent; not in an effect.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== "MemberExpression" ||
          !["reset", "setValue"].includes(calleeName(callee) ?? "")
        )
          return;
        for (let fn = node.parent; fn; fn = fn.parent) {
          const call = fn.parent;
          if (
            (fn.type === "ArrowFunctionExpression" || fn.type === "FunctionExpression") &&
            call?.type === "CallExpression" &&
            call.arguments[0] === fn &&
            effectHooks.has(calleeName(call.callee))
          ) {
            context.report({ node: callee, messageId: "inEffect" });
            return;
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "hooks-policy", version: "1.0.0" },
  rules: { justify: rule, "no-form-reset-in-effect": noFormResetInEffect },
};
