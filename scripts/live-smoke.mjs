import assert from "node:assert/strict";
const origin="https://poetry-gallery-api.tasconyeric.workers.dev";
const get=async path=>fetch(origin+path,{method:"GET",redirect:"error"});
const healthy=await get("/?op=health");
assert.equal(healthy.status,200,"Live D1 Worker health HTTP 200");
assert.equal(healthy.headers.get("access-control-allow-origin"),"*");
const info=await healthy.json();
assert.equal(info.backend,"d1");
assert.ok(["pending","owner-token"].includes(info.auth));
const gallery=await get("/?op=list");
assert.equal(gallery.status,200,"Live gallery HTTP 200");
assert.equal(gallery.headers.get("access-control-allow-origin"),"*");
const data=await gallery.json();
assert.ok(Array.isArray(data.poems),"live poems array");
assert.ok(data.poems.every(p=>p.status===undefined||p.status==="published"));
const nope=await get("/?op=detail&id=00000000-0000-4000-8000-000000000000");
assert.equal(nope.status,404,"nonexistent poem is 404");
const denied=await fetch(origin+"/?op=save",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({title:"Do not write",body:"This must be rejected"})
});
assert.ok([403,503].includes(denied.status),"anonymous post must be rejected");
const backup=await get("/?op=backup");
assert.ok([403,503].includes(backup.status),"anonymous export of draft and private images denied");
console.log("Live Cloudflare Worker HTTP checks passed; published count:",data.poems.length);
