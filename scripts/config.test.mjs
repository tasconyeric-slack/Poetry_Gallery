import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const config=require("../api/config.js");
const proxy=require("../api/poetry.js");
const oldUrl=process.env.POETRY_WORKER_URL,oldKey=process.env.POETRY_GATEWAY_KEY;
function mock(){
  const state={status:200,payload:null,headers:{}};
  const res={setHeader(k,v){state.headers[k]=v;return this;},
    status(s){state.status=s;return this;},
    json(d){state.payload=d;return this;},send(d){state.payload=d;return this;}};
  return {state,res};
}
try{
  delete process.env.POETRY_WORKER_URL;delete process.env.POETRY_GATEWAY_KEY;
  let m=mock();config({method:"GET"},m.res);
  assert.deepEqual(m.state.payload,{configured:false,backend:"d1"});
  m=mock();await proxy({method:"GET",query:{}},m.res);
  assert.equal(m.state.status,503);
  process.env.POETRY_WORKER_URL="https://poetry-gallery-api.example.workers.dev";
  process.env.POETRY_GATEWAY_KEY="private-value-never-sent-to-browser";
  m=mock();config({method:"GET"},m.res);
  assert.deepEqual(m.state.payload,{configured:true,backend:"d1"});
  assert.ok(!JSON.stringify(m.state.payload).includes("private-value"));
  m=mock();await proxy({method:"POST",headers:{
    origin:"https://evil.example",host:"shici.byliyz.com","content-type":"application/json"
  },query:{op:"save"},body:{}},m.res);
  assert.equal(m.state.status,403);
  console.log("Server-only config and origin gate tests passed.");
}finally{
  if(oldUrl===undefined)delete process.env.POETRY_WORKER_URL;
  else process.env.POETRY_WORKER_URL=oldUrl;
  if(oldKey===undefined)delete process.env.POETRY_GATEWAY_KEY;
  else process.env.POETRY_GATEWAY_KEY=oldKey;
}
