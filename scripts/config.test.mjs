import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),config=require('../api/config.js'),proxy=require('../api/poetry.js');
const original=globalThis.fetch,calls=[];
function mock(){const state={status:200,headers:{}};return {state,res:{setHeader(k,v){state.headers[k]=v;return this;},status(s){state.status=s;return this;},json(p){state.payload=p;return this;},send(p){state.payload=p;return this;}}};}
try{
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({ok:true,backend:'d1',auth:'pending',schema:'revisions-v3'}),{headers:{'content-type':'application/json'}});};
 let m=mock();await config({method:'GET'},m.res);assert.equal(m.state.payload.configured,false);
 m=mock();await proxy({method:'POST',headers:{origin:'https://evil.example',host:'shici.byliyz.com','content-type':'application/json'},query:{op:'save'},body:{}},m.res);assert.equal(m.state.status,403);
 const before=calls.length;
 for(const [method,op,body,authorization] of [['GET','backup',undefined,undefined],['POST','save',{title:'test'},'Bearer '+'a'.repeat(64)],['GET','cover',undefined,undefined]]){
  m=mock();await proxy({method,headers:{host:'shici.byliyz.com','content-type':'application/json',authorization},query:{op,id:'test-id'},body},m.res);assert.equal(m.state.status,200);
  const c=calls.at(-1);assert.ok(c.url.startsWith('https://poetry-gallery-api.tasconyeric.workers.dev/'));assert.equal(c.options.headers.authorization,authorization||'');assert.ok(!('x-poetry-gateway-key' in c.options.headers));assert.equal(c.options.redirect,'error');assert.equal(c.options.headers.origin,'https://shici.byliyz.com');
 }
 assert.equal(calls.length,before+3);
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,auth:'owner-token',schema:'revisions-v3'}));
 m=mock();await config({method:'GET'},m.res);assert.equal(m.state.payload.configured,true);
 globalThis.fetch=async()=>{throw Error('offline');};m=mock();await proxy({method:'GET',headers:{host:'shici.byliyz.com'},query:{}},m.res);assert.equal(m.state.status,502);
 console.log('Canonical Worker gateway readiness, caller-only authorization, origin rejection and failure PASS');
}finally{globalThis.fetch=original;}
