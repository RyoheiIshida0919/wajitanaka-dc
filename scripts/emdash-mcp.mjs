#!/usr/bin/env node
// EmDash の MCP を、`emdash login` で保存した鍵で呼ぶ（スキーマ・ブロック定義の変更用）。
//   node scripts/emdash-mcp.mjs <tool> '<json args>'   /   node scripts/emdash-mcp.mjs --list
import { readFileSync } from "node:fs";
const URL_ = "https://wajitanaka-dc.ishida-a0f.workers.dev";
const auth = JSON.parse(readFileSync(`${process.env.HOME}/.config/emdash/auth.json`, "utf8"))[URL_];
let id = 0;
async function rpc(method, params) {
  const res = await fetch(`${URL_}/_emdash/api/mcp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const text = await res.text();
  const line = text.startsWith("{") ? text : (text.split("\n").find((l) => l.startsWith("data:")) || "").slice(5);
  return JSON.parse(line);
}
let [tool, args] = process.argv.slice(2);
// 大きな引数（画像の base64 など）は標準入力から受け取る: node scripts/emdash-mcp.mjs <tool> -
if (args === "-") args = readFileSync(0, "utf8");
if (tool === "--list") {
  const r = await rpc("tools/list", {});
  for (const t of r.result.tools) console.log(t.name);
} else if (tool === "--schema") {
  const r = await rpc("tools/list", {});
  console.log(JSON.stringify(r.result.tools.find((t) => t.name === args)?.inputSchema, null, 1));
} else {
  const r = await rpc("tools/call", { name: tool, arguments: JSON.parse(args || "{}") });
  if (r.error) { console.error(JSON.stringify(r.error)); process.exit(1); }
  const c = r.result.content?.[0]?.text ?? JSON.stringify(r.result);
  if (r.result.isError) { console.error(c); process.exit(1); }
  console.log(c);
}
