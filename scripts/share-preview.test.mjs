import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),share=require('../api/share.js');
const id='11111111-1111-4111-8111-111111111111',cover='22222222-2222-4222-8222-222222222222';
let calls=[];
const originalFetch=globalThis.fetch;
function response(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.statusCode=n;return this;},send(body){this.body=body;return this;}};}
const request=(idValue=id)=>({method:'GET',query:{id:idValue},headers:{host:'evil.invalid',authorization:'Bearer must-never-forward'}});
try{
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({poem:{id,title:'题名"><script>alert(1)</script>',author:'作者 & " <',body:'一行\n</pre><script>evil()</script>',cover_id:cover}});};
 let r=response();await share(request(),r);
 assert.equal(r.statusCode,200);
 assert.match(r.body,/property="og:title"/);
 assert.match(r.body,/property="og:image" content="https:\/\/poetry-gallery-api\.tasconyeric\.workers\.dev\/\?op=cover&amp;id=/);
 assert.match(r.body,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.ok(!r.body.includes('<script>alert(1)'));
 assert.ok(!r.body.includes('</pre><script>evil()'));
 assert.ok(!r.body.includes('evil.invalid'));
 assert.match(r.body,new RegExp('window.location.replace\\("/#poem/'+id+'"\\)'));
 assert.match(r.headers['cache-control'],/no-store/);
 assert.equal(calls[0].options.headers.authorization,undefined);
 assert.equal(calls[0].url,'https://poetry-gallery-api.tasconyeric.workers.dev/?op=detail&id='+id);
 assert.equal(calls[0].options.redirect,'error');
 calls=[];r=response();await share(request('../private'),r);assert.equal(r.statusCode,404);assert.equal(calls.length,0);
 r=response();await share(request([id]),r);assert.equal(r.statusCode,404);assert.equal(calls.length,0);
 globalThis.fetch=async()=>new Response('{"private":"secret draft"}',{status:404});
 r=response();await share(request(),r);assert.equal(r.statusCode,404);assert.ok(!r.body.includes('secret draft'));assert.ok(!r.body.includes('og:title'));
 globalThis.fetch=async()=>{throw Error('network unavailable');};
 r=response();await share(request(),r);assert.equal(r.statusCode,404);
 globalThis.fetch=async()=>Response.json({poem:{id,title:'private title',body:'private content',status:'draft'}});
 r=response();await share(request(),r);assert.equal(r.statusCode,404);assert.ok(!r.body.includes('private content'));
 globalThis.fetch=async()=>Response.json({poem:{id,title:'公开',body:'诗句',cover_id:'https://evil.invalid/image'}});
 r=response();await share(request(),r);assert.equal(r.statusCode,200);assert.ok(!r.body.includes('og:image'));assert.ok(!r.body.includes('evil.invalid'));
 r=response();await share({...request(),method:'HEAD'},r);assert.equal(r.statusCode,200);assert.equal(r.body,'');
 console.log('Share preview PASS: public SSR metadata, escaped injection, no forwarded credentials/host poisoning, withdrawn 404, invalid IDs, network failure, trusted cover endpoint, HEAD.');
}finally{globalThis.fetch=originalFetch;}
