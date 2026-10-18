import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const handler = require("../api/config.js");
const savedUrl = process.env.SUPABASE_URL;
const savedKey = process.env.SUPABASE_PUBLISHABLE_KEY;
function call(method = "GET") {
  const result = {statusCode: 200, headers: {}, data: null};
  const res = {
    setHeader(k,v) { result.headers[k] = v; return this; },
    status(code) { result.statusCode = code; return this; },
    json(value) { result.data = value; return this; }
  };
  handler({method},res);
  return result;
}
try {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.deepEqual(call().data,{configured:false});
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_secret_NEVER_EXPOSE";
  assert.deepEqual(call().data,{configured:false},"secret key must never be exposed");
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_public_test_only";
  assert.deepEqual(call().data,{
    configured:true,
    url:"https://example.supabase.co",
    key:"sb_publishable_public_test_only"
  });
  assert.equal(call("POST").statusCode,405);
  assert.equal(call().headers["Cache-Control"],"no-store");
  process.env.SUPABASE_URL = "https://malicious.example.net";
  assert.deepEqual(call().data,{configured:false},"reject untrusted Supabase URL");
  console.log("Runtime config handler tests passed (no real credentials used).");
} finally {
  if (savedUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = savedUrl;
  if (savedKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = savedKey;
}
