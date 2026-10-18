import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("worker/index.js","utf8");
const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const id1="00000000-0000-4000-8000-000000000001",id2="00000000-0000-4000-8000-000000000002";
const img1="10000000-0000-4000-8000-000000000001",img2="10000000-0000-4000-8000-000000000002";
const published={id:id1,title:"已发布",body:"第一行\n第二行",genre:"五言",note:"",status:"published",cover_id:img1};
const privatePoem={id:id2,title:"保密草稿",body:"私密正文",genre:"词",note:"",status:"draft",cover_id:img2};
const jpeg=Buffer.from([255,216,255,224,1,2,3,4,5,6,7,8]).toString("base64");
const sqlSeen=[];
const env={DB:{prepare(sql){const q={sql,params:[]};sqlSeen.push(q);return{
  bind(...params){q.params=params;return this;},
  async all(){if(sql.includes("status='published'"))return {results:[published]};throw Error("Unexpected list SQL");},
  async first(){
    if(sql.includes("FROM poems WHERE id=? AND status='published'"))return q.params[0]===id1?published:null;
    if(sql.includes("FROM covers c INNER JOIN poems")) {
      if(q.params[0]===img1)return {base64:jpeg,media_type:"image/jpeg",status:"published"};
      if(q.params[0]===img2)return {base64:jpeg,media_type:"image/jpeg",status:"draft"};
      return null;
    }
    throw Error("Unexpected detail SQL");
  }
};}}};
async function call(op,method="GET",body){
  return worker.fetch(new Request("https://example.workers.dev/?op="+op,{
    method,headers:body?{"content-type":"application/json"}:undefined,
    body:body?JSON.stringify(body):undefined}),env);
}
let r=await call("health");assert.equal(r.status,200);assert.equal((await r.json()).auth,"pending");
r=await call("list");assert.equal(r.status,200);
assert.equal(r.headers.get("access-control-allow-origin"),"*");
const visible=(await r.json()).poems;assert.equal(visible.length,1);
assert.ok(!JSON.stringify(visible).includes("保密草稿"));
r=await call("detail&id="+id1);assert.equal(r.status,200);
assert.equal((await r.json()).poem.body,"第一行\n第二行");
r=await call("detail&id="+id2);assert.equal(r.status,404);
r=await call("cover&id="+img1);assert.equal(r.status,200);
r=await call("cover&id="+img2);assert.equal(r.status,404);
for(const op of ["owner-list","session","backup"])assert.equal((await call(op)).status,403);
for(const op of ["save","delete","upload","verify"])
  assert.equal((await call(op,"POST",{id:id1,title:"unauthorized"})).status,403);
r=await call("list","OPTIONS");assert.equal(r.status,204);
assert.equal(r.headers.get("access-control-allow-origin"),"*");
assert.ok(sqlSeen.every(x=>!x.sql.includes("INSERT")&&!x.sql.includes("DELETE")));
console.log("Worker behavioral checks passed: public/secret boundaries, CORS, writes denied.");
