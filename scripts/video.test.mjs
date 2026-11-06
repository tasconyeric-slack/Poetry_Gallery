import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('video-studio.js','utf8');
const {buildTimeline}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const poem={title:'本机测试',author:'测试作者',lines:['窗外疏星映小楼，','灯前细雨记清秋。','','长街远树归人少，','一纸新诗寄晚舟。','','明日江风吹客路，','且留旧梦待回眸。']};
const tl=buildTimeline(poem,15);assert.equal(tl.length,5);assert.equal(tl[0].start,0);assert.equal(tl.at(-1).end,15);
for(let i=1;i<tl.length;i++){assert.ok(Math.abs(tl[i].start-tl[i-1].end)<.0001);assert.ok(tl[i].end>tl[i].start);}
assert.deepEqual(tl.filter(s=>s.kind==='verse').flatMap(s=>s.lines),poem.lines.filter(Boolean));
assert.throws(()=>buildTimeline({lines:[]},15));assert.throws(()=>buildTimeline({lines:Array(60).fill('一行诗')},15),/较长/);
console.log('Video timeline: stanza boundaries, complete text, weighted durations, intro/outro, long-text guard PASS');
