import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const html = readFileSync("index.html","utf8");
const css = readFileSync("styles.css","utf8");
const js = readFileSync("app.js","utf8");

for (const path of ["index.html","styles.css","app.js","AGENTS.md","docs/MVP_SPEC.md"]) {
  assert.ok(existsSync(path), `missing ${path}`);
}
for (const [label,pattern] of [
  ["Chinese document language", /<html lang="zh-CN">/],
  ["viewport", /name="viewport"/],
  ["stylesheet", /href="\.\/styles\.css"/],
  ["application script", /src="\.\/app\.js"/],
  ["gallery", /id="poem-grid"/],
  ["search", /id="poem-search"/],
  ["reader", /id="reading-view"/],
  ["share", /id="share-poem"/],
  ["print", /id="print-poem"/],
  ["demo disclaimer", /古典诗词示例/]
]) assert.match(html,pattern,`missing ${label}`);

for (const title of ["静夜思","山居秋暝","江畔独步寻花"]) assert.ok(js.includes(title),`missing demo ${title}`);
assert.match(js,/window\.addEventListener\("hashchange", renderRoute\)/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css,/@media print/);
console.log("Static structure smoke checks passed.");
