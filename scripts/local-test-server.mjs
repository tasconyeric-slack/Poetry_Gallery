// Synthetic local SQLite + the actual Worker; never contacts Cloudflare.
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const f of ['0001_poems.sql','0002_author.sql','0003_revisions.sql','0004_collections.sql'])db.exec(readFileSync('worker/migrations/'+f,'utf8'));
const DB={prepare(sql){let args=[];const q={bind(...a){args=a;return q;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){if(/^SELECT/i.test(sql))return {results:db.prepare(sql).all(...args)};return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};return q;},async batch(qs){db.exec('BEGIN');try{const r=[];for(const q of qs)r.push(await q.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const source=readFileSync('worker/index.js','utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={DB,POETRY_OWNER_TOKEN:'a'.repeat(64)};
createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost:8080');
 if(url.pathname==='/api'){
  let data='';for await(const chunk of req)data+=chunk;
  const init={method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:data};
  const r=process.env.POETRY_LOCAL_WORKER_URL?await fetch(process.env.POETRY_LOCAL_WORKER_URL+'/'+url.search,init):await worker.fetch(new Request('http://localhost:8080/'+url.search,init),env);
  const bytes=Buffer.from(await r.arrayBuffer());const headers=new Headers(r.headers);headers.delete("content-encoding");headers.delete("content-length");res.writeHead(r.status,Object.fromEntries(headers));res.end(bytes);return;
 }
 const file=resolve('.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(resolve('.')+'\\')&&!file.startsWith(resolve('.')+'/')){res.writeHead(403);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webm':'video/webm','.mp4':'video/mp4'};
 const bytes=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','content-length':bytes.length});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
}).listen(8080,'127.0.0.1',()=>console.log('Synthetic local Worker + SQLite on localhost:8080'));
