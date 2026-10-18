import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
for(const p of ["worker/index.js","worker/migrations/0001_poems.sql",
  "api/poetry.js","api/config.js","cms.js","cms.css","wrangler.toml",".env.example"])
  assert.ok(existsSync(p),"missing "+p);
const code=read("worker/index.js"),schema=read("worker/migrations/0001_poems.sql");
const client=read("cms.js"),html=read("index.html"),proxy=read("api/poetry.js");
for(const op of ["send","verify","session","logout","save","delete","upload","cover","list","owner-list"])
  assert.ok(code.includes('"'+op+'"'),"missing "+op);
for(const required of ["owner_sessions","sms_requests","covers","poems","poetry-gallery-d1"])
  assert.ok((schema+read("wrangler.toml")).includes(required));
for(const text of ["GATEWAY_KEY","OTP_PEPPER","OWNER_PHONE","TENCENT_SECRET_KEY","sent_at","daily_count","HttpOnly","Secure","SameSite=Lax","status='published'"])
  assert.ok(code.includes(text),"missing "+text);
assert.match(proxy,/POETRY_WORKER_URL/);
assert.match(proxy,/POETRY_GATEWAY_KEY/);
assert.match(proxy,/origin/);
assert.match(read("api/config.js"),/backend:"d1"/);
assert.ok(client.includes("getContext("),"cover compression missing");
assert.ok(client.includes('api("verify"'),"phone login missing");
assert.ok(html.includes('id="send-code"'));
assert.ok(!html.includes('name="email"'));
assert.ok(!client.includes("supabase"));
console.log("D1 SMS publishing structure/security checks passed. Live SMS untested.");
