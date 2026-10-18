import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read = path => readFileSync(path,"utf8");
for (const path of ["cms.js","cms.css","api/config.js",".env.example",
  "supabase/migrations/20261018000000_poetry_gallery.sql"]) {
  assert.ok(existsSync(path),"missing "+path);
}
const page = read("index.html");
const client = read("cms.js");
const sql = read("supabase/migrations/20261018000000_poetry_gallery.sql");
const config = read("api/config.js");
for (const id of ["admin-view","login-form","admin-workspace","poem-form","cover-upload",
  "reader-cover","admin-feedback","collection-status"]) {
  assert.ok(page.includes('id="'+id+'"'),"missing "+id);
}
for (const feature of ["signInWithOtp","shouldCreateUser:false","poetry_owners",
  "createSignedUrl","refreshGallery","savePoem","status","published","draft"]) {
  assert.ok(client.includes(feature),"missing "+feature);
}
for (const required of [/alter table public.poems enable row level security/,
  /alter table public.poetry_owners enable row level security/,
  /for select to anon, authenticated/,
  /for insert to authenticated/,
  /for update to authenticated/,
  /for delete to authenticated/,
  /create policy "published cover or owner read"/,
  /create policy "owner uploads cover"/,
  /public = false/,
  /storage.foldername\(name\)/]) {
  assert.match(sql,required,"missing database restriction");
}
assert.doesNotMatch(client,/service_role|sb_secret_/);
assert.doesNotMatch(config,/SERVICE_ROLE|sb_secret_/);
assert.match(config,/SUPABASE_PUBLISHABLE_KEY/);
console.log("MVP structure and static RLS checks passed; real integration requires a dedicated Supabase project.");
