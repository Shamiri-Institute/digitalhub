// Codemod: replace useMemo/useCallback calls with their plain equivalents.
// useCallback(fn, deps) -> fn ; useMemo(() => expr, deps) -> expr ;
// useMemo(() => { ...; return x; }, deps) -> single-return block becomes x, otherwise an IIFE.
const ts = require("typescript");
const fs = require("fs");
const KEEP = new Set(["lib/hooks/use-s3-upload.tsx::FileInput"]);
const files = process.argv.slice(2);
let total = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if ((name === "useMemo" || name === "useCallback") && node.arguments.length >= 1) {
        const parent = node.parent;
        const varName = ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) ? parent.name.text : "";
        if (!KEEP.has(`${file}::${varName}`)) {
          const fn = node.arguments[0];
          let replacement;
          if (name === "useCallback") {
            replacement = fn.getText(sf);
          } else if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) {
            replacement = fn.body.getText(sf);
          } else if (ts.isArrowFunction(fn) && ts.isBlock(fn.body) && fn.body.statements.length === 1 && ts.isReturnStatement(fn.body.statements[0]) && fn.body.statements[0].expression) {
            replacement = fn.body.statements[0].expression.getText(sf);
          } else {
            replacement = `(${fn.getText(sf)})()`;
          }
          // keep an explicit generic as a type annotation on the variable when present
          if (node.typeArguments?.length && ts.isVariableDeclaration(parent) && !parent.type) {
            edits.push({ start: parent.name.end, end: parent.name.end, text: `: ${node.typeArguments[0].getText(sf)}` });
          }
          edits.push({ start: node.getStart(sf), end: node.end, text: replacement });
          total++;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(file, out);
  console.log(`${file}: ${edits.length} edit(s)`);
}
console.log(`total replaced: ${total}`);
