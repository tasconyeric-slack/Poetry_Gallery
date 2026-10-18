import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
for(const p of ["worker/index.js","cms.js","app.js","api/poetry.js","wrangler.toml"])
  assert.ok(existsSync(p), "missing "+p);
const worker=read("worker/index.js"),client=read("cms.js"),html=read("index.html");
for(const op of ["list","detail","cover","owner-list","save","delete","upload"])
  assert.ok(worker.includes('"'+op+'"'), "missing "+op);
for(const text of ["GATEWAY_KEY","ADMIN_AUTH_ENABLED","Access-Control-Allow-Origin","status='published'"])
  assert.ok(worker.includes(text),"missing security rule "+text);
for(const stale of ["sendTencentSms","TENCENT_SECRET_KEY","OWNER_PHONE","OTP_PEPPER","name=\"phone\"","send-code"])
  assert.ok(!(worker+html).includes(stale),"obsolete SMS flow "+stale);
assert.match(client,/PUBLIC_API/);
assert.match(client,/showExamples/);
assert.match(html,/通行密钥/);
assert.match(read("wrangler.toml"),/poetry-gallery-d1/);
console.log("Published gallery structure and disabled admin checks passed.");
