// Synthetic fixtures only. Optional URL is restricted to the local workerd runtime.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {restoreArchive} from './restore-archive.mjs';
const remote=process.env.POETRY_LOCAL_WORKER_URL;
if(remote&&!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(remote))throw Error('Local Worker only');
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const f of ['0001_poems.sql','0002_author.sql','0003_revisions.sql'])db.exec(readFileSync('worker/migrations/'+f,'utf8'));
const DB={prepare(sql){let args=[];const q={bind(...a){args=a;return q;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){if(/^SELECT/i.test(sql))return {results:db.prepare(sql).all(...args)};return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};return q;},async batch(qs){db.exec('BEGIN');try{const r=[];for(const q of qs)r.push(await q.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(readFileSync('worker/index.js')).toString('base64'));
const token='a'.repeat(64),env={DB,POETRY_OWNER_TOKEN:token};
async function send(op,body,owner=true){const init={method:body?'POST':'GET',headers:{origin:'http://localhost:8080',...(owner?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined};return remote?fetch(remote+'/?op='+op,init):worker.fetch(new Request('http://localhost:8787/?op='+op,init),env);}
const input={localId:crypto.randomUUID(),title:'本地回归',author:'合成测试',body:'\n第一行\n\n第二段\n',genre:'五言',status:'draft'};
let health=await send('health',undefined,false);assert.equal(health.status,200);assert.equal((await health.json()).schema,'revisions-v3');
for(const [origin,status] of [['http://localhost:8080',204],['https://hostile.invalid',403]]){
 const init={method:'OPTIONS',headers:{origin,'access-control-request-method':'POST','access-control-request-headers':'authorization, content-type'}};
 const preflight=remote?await fetch(remote+'/?op=save',init):await worker.fetch(new Request('http://localhost:8787/?op=save',init),env);
 assert.equal(preflight.status,status);
}
let r=await send('session');assert.equal(r.status,200);
r=await send('save',input);assert.equal(r.status,200);let saved=await r.json();
// Lost response after committed create: the same device draft must resolve to one ID.
r=await send('save',input);assert.equal(r.status,200);assert.deepEqual(await r.json(),saved,'create retry must not duplicate');
const id=saved.id;
r=await send('save',{...input,body:'different uncertain retry'});assert.equal(r.status,409);
for(const op of ['owner-list','backup','revisions&id='+id,'session'])assert.equal((await send(op,undefined,false)).status,403);
assert.equal((await send('save',input,false)).status,403);
const jpeg=Buffer.from([255,216,255,224,1,2,3,4,5,6,7,8]).toString('base64');
async function upload(version){return send('upload',{poem_id:id,version,mime:'image/jpeg',base64:jpeg});}
r=await upload(saved.version);assert.equal(r.status,200);const first=await r.json();assert.equal(first.version,saved.version+1);
assert.equal((await upload(saved.version)).status,409,'stale cover update rejected');
saved.version=first.version;
r=await send('save',{...input,id,version:saved.version,status:'published'});assert.equal(r.status,200);saved=await r.json();
assert.equal((await send('detail&id='+id,undefined,false)).status,200);
assert.equal((await send('cover&id='+first.cover_id,undefined,false)).status,200);
r=await upload(saved.version);assert.equal(r.status,200);const second=await r.json();
r=await send('restore',{id,version:second.version,revision:saved.version});assert.equal(r.status,200);saved=await r.json();
let poem=(await (await send('owner-list')).json()).poems.find(p=>p.id===id);
assert.equal(poem.cover_id,first.cover_id,'restore includes historical cover');
r=await send('save',{...input,id,version:saved.version,status:'draft'});assert.equal(r.status,200);saved=await r.json();
for(const op of ['detail&id='+id,'cover&id='+first.cover_id,'cover&id='+second.cover_id])assert.equal((await send(op,undefined,false)).status,404);
const archive=await (await send('backup')).json();
const recovery=new DatabaseSync(':memory:');recovery.exec('PRAGMA foreign_keys=ON');for(const f of ['0001_poems.sql','0002_author.sql','0003_revisions.sql'])recovery.exec(readFileSync('worker/migrations/'+f,'utf8'));
restoreArchive(recovery,archive);
assert.equal(recovery.prepare('SELECT body FROM poems WHERE id=?').get(id).body,input.body);
assert.equal(recovery.prepare('SELECT COUNT(*) n FROM covers WHERE poem_id=?').get(id).n,2);
assert.ok(recovery.prepare('SELECT COUNT(*) n FROM poem_revisions WHERE poem_id=?').get(id).n>=4);
const damaged=structuredClone(archive);damaged.covers=[];assert.throws(()=>restoreArchive(recovery,damaged),/missing cover/);
assert.equal((await send('delete',{id,version:saved.version})).status,400,'explicit deletion confirmation required');
assert.equal((await send('delete',{id,version:1,confirm:true})).status,409);
assert.equal((await send('delete',{id,version:saved.version,confirm:true})).status,200);
assert.equal((await send('detail&id='+id,undefined,false)).status,404);
db.close();recovery.close();console.log('Cloud regression PASS: retry, cover versions/restore, publication, authorization, backup recovery, confirmed conditional deletion'+(remote?' (workerd/D1)':' (SQLite)'));
