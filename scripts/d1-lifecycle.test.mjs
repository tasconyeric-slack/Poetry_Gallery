// Synthetic owner capability integration against real SQLite. Never remote.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
const db=new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys=ON;");
db.exec(readFileSync("worker/migrations/0001_poems.sql","utf8"));
db.exec(readFileSync("worker/migrations/0002_author.sql","utf8"));
db.exec(readFileSync("worker/migrations/0003_revisions.sql","utf8"));
const adapter={
  prepare(sql){
    let args=[];
    const command={
      bind(...params){args=params;return command;},
      async first(){return db.prepare(sql).get(...args)||null;},
      async all(){return {results:db.prepare(sql).all(...args)};},
      async run(){if(/^SELECT/i.test(sql))return {results:db.prepare(sql).all(...args)};const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}
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
const env={DB:adapter,GATEWAY_KEY:key,POETRY_OWNER_TOKEN:token};
const fakeSession={"x-poetry-gateway-key":key,"authorization":"Bearer "+token};
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
  author:"本地测试作者",genre:"五言",note:"校验换行",status:"draft"},true);
assert.equal(response.status,200);
const created=await response.json();
const id=created.id;
let version=created.version;
assert.match(id,/^[a-f0-9-]{36}$/);
response=await send("list");assert.deepEqual((await response.json()).poems,[]);
response=await send("detail","GET",undefined,false,"&id="+id);
assert.equal(response.status,404);
response=await send("owner-list","GET",undefined,true);
let privateItems=(await response.json()).poems;
assert.equal(privateItems.length,1);
assert.equal(privateItems[0].body,"第一句\n第二句");
const sampleJpeg=Buffer.from([255,216,255,224,1,2,3,4,5,6,7,8,9,10,11,12]).toString("base64");
response=await send("upload","POST",{poem_id:id,version,mime:"image/jpeg",base64:sampleJpeg},true);
assert.equal(response.status,200);
const uploaded=await response.json();const coverId=uploaded.cover_id;version=uploaded.version;
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,404,"draft image stays private");
response=await send("backup","GET",undefined,true);
assert.equal(response.status,200);
const archive=await response.json();
assert.equal(archive.format,"poetry-gallery-backup-v2");
assert.equal(archive.poems.length,1);
assert.equal(archive.covers.length,1);
assert.equal(archive.covers[0].base64,sampleJpeg);
response=await send("save","POST",{id,version,title:"山中秋日·修订",body:"新的第一句\n新的第二句",
  genre:"五言",note:"编辑成功",status:"published"},true);
assert.equal(response.status,200);
version=(await response.json()).version;
response=await send("save","POST",{id,version:1,title:"过期写入",body:"不能覆盖",genre:"五言"},true);
assert.equal(response.status,409);
response=await send("revisions","GET",undefined,true,"&id="+id);
const revisions=(await response.json()).revisions;
assert.equal(revisions.length,2);
assert.equal(revisions[1].author,"本地测试作者");
response=await send("restore","POST",{id,version,revision:revisions[0].version},true);
assert.equal(response.status,200);version=(await response.json()).version;
response=await send("save","POST",{id,version,title:"山中秋日·修订",body:"新的第一句\n新的第二句",genre:"五言",status:"published"},true);
assert.equal(response.status,200);version=(await response.json()).version;
response=await send("list");
const published=(await response.json()).poems;
assert.equal(published.length,1);
assert.equal(published[0].title,"山中秋日·修订");
assert.equal(published[0].cover_id,coverId);
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,200,"published image is public");
response=await send("save","POST",{id,version,title:"山中秋日·修订",body:"新的第一句\n新的第二句",
  genre:"五言",status:"draft"},true);
assert.equal(response.status,200);version=(await response.json()).version;
response=await send("list");assert.deepEqual((await response.json()).poems,[]);
response=await send("cover","GET",undefined,false,"&id="+coverId);
assert.equal(response.status,404,"unpublished cover loses public access");
response=await send("delete","POST",{id,version,confirm:true},true);
assert.equal(response.status,200);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM poems").get().n,0);
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM covers").get().n,0);
db.close();
console.log("D1 SQLite owner-token CRUD/cover/conflict/revision restore lifecycle passed.");
