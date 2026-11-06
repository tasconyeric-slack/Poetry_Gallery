import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {validate,toSql} from './import-poems.mjs';
const db=new DatabaseSync(':memory:');
for(const path of ['0001_poems.sql','0002_author.sql'])db.exec(readFileSync('worker/migrations/'+path,'utf8'));
const fixture=JSON.parse(readFileSync('examples/poems.template.json','utf8'));
fixture[0].author="测试 O'作者";fixture[0].status='published';
fixture.push({...fixture[0],id:'00000000-0000-4000-8000-000000000002',status:'draft'});
db.exec(toSql(fixture));db.exec(toSql(fixture));
assert.equal(db.prepare('SELECT COUNT(*) n FROM poems').get().n,2);
assert.equal(db.prepare("SELECT COUNT(*) n FROM poems WHERE status='published'").get().n,1);
const first=db.prepare('SELECT * FROM poems WHERE id=?').get(fixture[0].id);
assert.equal(first.author,fixture[0].author);assert.equal(first.body,fixture[0].body);
fixture[0].title='测试修订';fixture[0].body='修订第一行\n\n修订下一段';
db.exec(toSql(fixture));
assert.equal(db.prepare('SELECT body FROM poems WHERE id=?').get(fixture[0].id).body,fixture[0].body);
assert.equal(db.prepare('SELECT title FROM poems WHERE id=?').get(fixture[0].id).title,'测试修订');
assert.throws(()=>validate([{...fixture[0],status:'public'}]));
assert.throws(()=>validate([{...fixture[0],composed_on:'2026-02-30'}]));
assert.throws(()=>validate([fixture[0],fixture[0]]));
// Exercise the actual public Worker against imported SQLite records.
const source=readFileSync('worker/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const DB={prepare(sql){let args=[];const q={bind(...values){args=values;return q;},
  async first(){return db.prepare(sql).get(...args)||null;},
  async all(){return {results:db.prepare(sql).all(...args)};}};return q;}};
const send=(op,id='')=>worker.fetch(new Request('https://test.invalid/?op='+op+'&id='+id),{DB});
const list=await (await send('list')).json();
assert.equal(list.poems.length,1);assert.equal(list.poems[0].author,fixture[0].author);
const detail=await (await send('detail',fixture[0].id)).json();
assert.equal(detail.poem.body,fixture[0].body);
assert.equal((await send('detail',fixture[1].id)).status,404);
db.close();console.log('Import SQLite: attribution, newlines, drafts, idempotency, updates and validation passed.');
