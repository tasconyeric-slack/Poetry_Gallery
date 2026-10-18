// Test only: simulate an already-authenticated owner with an in-memory SQLite
// session. The production Worker has NO registration or login endpoint enabled.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
const db=new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON;");
db.exec(readFileSync("worker/migrations/0001_poems.sql","utf8"));
const adapter={
  prepare(sql){
    let args=[];
    const command={
      bind(...params){args=params;return command;},
      async first(){return db.prepare(sql).get(...args)||null;},
      async all(){return {results:db.prepare(sql).all(...args)};},
      async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}
    };
    return command;
  },
  async batch(queries){
    db.exec("BEGIN IMMEDIATE");
    try{
      const result=[];
      for(const q of queries)result.push(await q.run());
      db.exec("COMMIT");
      return result;
    }catch(error){db.exec("ROLLBACK");throw error;}
  }
};
const token="a".repeat(64),key="simulated-test-only-secret",time=Math.floor(Date.now()/1000);
const hash=createHash("sha256").update(token).digest("hex");
db.prepare("INSERT INTO owner_sessions(token_hash,created_at,expires_at) VALUES(?,?,?)")
  .run(hash,time,time+86400);
const source=readFileSync("worker/index.js","utf8");
const {default:worker}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const env={DB:adapter,GATEWAY_KEY:key,ADMIN_AUTH_ENABLED:"passkey"};
const fakeSession={"x-poetry-gateway-key":key,"cookie":"poetry_sid="+token};
const send=(op,method="GET",body,authenticated=false,extra="")=>{
  const headers=authenticated?{...fakeSession}:{};
  if(body!==undefined)headers["content-type"]="application/json";
  return worker.fetch(new Request("https://poetry-gallery-api.test/?op="+op+extra,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body)
  }),env);
};
let response=await send("save","POST",{title:"非法写入",body:"应被阻止"});
assert.equal(response.status,403);
response=await send("owner-list","GET",undefined,true);
assert.equal(response.status,200);
response=await send("save","POST",{title:"山中秋日",body:"第一句\n第二句",
  genre:"五言",note:"校验换行",status:"draft"},true);
assert.equal(response.status,200);
const id=(await response.json()).id;
assert.match(id,/^[a-f0-9-]{36}$/);
response=await send("list");assert.deepEqual((await response.json()).poems,[]);
response=await send("detail","GET",undefined,false,"&id="+id);
assert.equal(response.status,404);
response=await send("owner-list","GET",undefined,true);
let privateItems=(await response.json()).poems;
assert.equal(privateItems.length,1);
assert.equal(privateItems[0].body,"第一句\n第二句");
const sampleJpeg=Buffer.from([255,216,255,224,1,2,3,4,5,6,7,8,9,10,11,12]).toString("base64");
response=await send("upload","POST",{poem_id:id,mime:"image/jpeg",base64:sampleJpeg},true);
assert.equal(response.status,200);
const coverId=(await response.json()).cover_id;
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,404,"draft image stays private");
response=await send("save","POST",{id,title:"山中秋日·修订",body:"新的第一句\n新的第二句",
  genre:"五言",note:"编辑成功",status:"published"},true);
assert.equal(response.status,200);
response=await send("list");
const published=(await response.json()).poems;
assert.equal(published.length,1);
assert.equal(published[0].title,"山中秋日·修订");
assert.equal(published[0].cover_id,coverId);
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,200,"published image is public");
response=await send("save","POST",{id,title:"山中秋日·修订",body:"新的第一句\n新的第二句",
  genre:"五言",status:"draft"},true);
assert.equal(response.status,200);
response=await send("list");assert.deepEqual((await response.json()).poems,[]);
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,404,"unpublished cover loses public access");
response=await send("delete","POST",{id},true);
assert.equal(response.status,200);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM poems").get().n,0);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM covers").get().n,0);
db.close();
console.log("D1 SQL-backed simulated owner CRUD/cover lifecycle passed. No real login was enabled.");
