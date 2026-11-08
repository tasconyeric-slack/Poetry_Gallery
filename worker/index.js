// Poetry Gallery only: published reads plus server-verified owner capability APIs.
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}
});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const ownerConfigured=env=>typeof env.POETRY_OWNER_TOKEN==='string'&&/^[a-f0-9]{64,}$/i.test(env.POETRY_OWNER_TOKEN);
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function digest(data) {
  return hex(await crypto.subtle.digest("SHA-256",encoder.encode(data)));
}
async function isOwner(request,env) {
  const configured=env.POETRY_OWNER_TOKEN;
  if(typeof configured!=="string"||! /^[a-f0-9]{64,}$/i.test(configured))return false;
  const supplied=request.headers.get("authorization")||"";
  // Hash both values to equal-size buffers before comparing; never log the capability.
  const a=await digest(supplied),b=await digest("Bearer "+configured);
  let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
function error(message,status=400){return json({error:message},status);}
async function parseBody(request) {
  if(!request.headers.get("content-type")?.startsWith("application/json"))throw Error("JSON required");
  const len=Number(request.headers.get("content-length")||0);
  if(len>1200000)throw Error("Payload too large");
  const raw=await request.text();
  if(raw.length>1200000)throw Error("Payload too large");
  return JSON.parse(raw||"{}");
}
function inputPoem(body) {
  const title=String(body.title||"").trim();
  const text=String(body.body||"").replace(/\r\n?/g,"\n");
  const genre=String(body.genre||"其他");
  const note=String(body.note||"").trim();
  const author=String(body.author||"").trim();
  const composed=body.composed_on?String(body.composed_on):null;
  if(author.length>120||!title||title.length>120||!text.trim()||text.length>30000||
    !["五言","七言","词","其他"].includes(genre)||note.length>5000||
    (body.status!==undefined&&!["draft","published"].includes(body.status))||
    (composed&&(!/^\d{4}-\d{2}-\d{2}$/.test(composed)||!Number.isFinite(Date.parse(composed))||new Date(composed).toISOString().slice(0,10)!==composed)))throw Error("诗作字段无效");
  return {author,title,body:text,genre,note,composed,status:body.status==="published"?"published":"draft"};
}
async function handler(request,env) {
  if(!env.DB) return error("Database unavailable",503);
  const url=new URL(request.url);
  const op=url.searchParams.get("op")||"list";
  const publicRead=request.method==="GET"&&["list","detail","cover","health","collections","collection-detail"].includes(op);
  if(!publicRead){
    const origin=request.headers.get("origin");
    if(origin&&!allowedOrigins(env).includes(origin))return error("Origin rejected",403);
    if(!ownerConfigured(env))return error("云端发布尚未正确配置 POETRY_OWNER_TOKEN，请先使用本机草稿。",503);
    if(!await isOwner(request,env))return error("Forbidden",403);
  }
  if(request.method==="GET") {
    if(op==="collections"||op==="owner-collections") {
      const owner=op==="owner-collections";
      const {results}=await env.DB.prepare(owner
        ? "SELECT c.*,COUNT(i.poem_id) AS poem_count FROM collections c LEFT JOIN collection_items i ON i.collection_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC"
        : "SELECT c.id,c.title,c.intro,c.cover,c.updated_at,COUNT(p.id) AS poem_count FROM collections c LEFT JOIN collection_items i ON i.collection_id=c.id LEFT JOIN poems p ON p.id=i.poem_id AND p.status='published' WHERE c.status='published' GROUP BY c.id ORDER BY c.updated_at DESC").all();
      return json({collections:results});
    }
    if(op==="collection-detail") {
      const id=url.searchParams.get("id")||"";
      if(!uuid.test(id))return error("Not found",404);
      const owner=await isOwner(request,env);
      const collection=await env.DB.prepare(owner?"SELECT * FROM collections WHERE id=?":"SELECT id,title,intro,cover,updated_at FROM collections WHERE id=? AND status='published'").bind(id).first();
      if(!collection)return error("Not found",404);
      const {results:poems}=await env.DB.prepare(owner
        ? "SELECT p.*,i.position FROM collection_items i JOIN poems p ON p.id=i.poem_id WHERE i.collection_id=? ORDER BY i.position"
        : "SELECT p.id,p.title,p.author,p.body,p.genre,p.note,p.composed_on,p.published_at,p.cover_id,i.position FROM collection_items i JOIN poems p ON p.id=i.poem_id WHERE i.collection_id=? AND p.status='published' ORDER BY i.position").bind(id).all();
      return json({collection,poems});
    }
    if(op==="health") {
      try{await env.DB.prepare("SELECT version FROM poems LIMIT 1").all();await env.DB.prepare("SELECT version FROM poem_revisions LIMIT 1").all();}
      catch{return json({ok:false,backend:"d1",schema:"migration-required",auth:ownerConfigured(env)?"owner-token":"pending"},503);}
      return json({ok:true,backend:"d1",schema:"revisions-v3",auth:ownerConfigured(env)?"owner-token":"pending"});
    }
    if(op==="list") {
      const {results}=await env.DB.prepare("SELECT id,title,author,body,genre,note,composed_on,published_at,cover_id FROM poems WHERE status='published' ORDER BY published_at DESC").all();
      return json({poems:results});
    }
    if(op==="detail") {
      const id=url.searchParams.get("id")||"";
      if(!/^[a-f0-9-]{36}$/.test(id))return error("Not found",404);
      const poem=await env.DB.prepare("SELECT id,title,author,body,genre,note,composed_on,published_at,cover_id FROM poems WHERE id=? AND status='published'").bind(id).first();
      return poem?json({poem}):error("Not found",404);
    }
    if(op==="revisions"){
      const {results}=await env.DB.prepare("SELECT * FROM poem_revisions WHERE poem_id=? ORDER BY version DESC LIMIT 100").bind(url.searchParams.get("id")||"").all();
      return json({revisions:results});
    }
    if(op==="session")return json({owner:await isOwner(request,env)});
    if(op==="owner-list"){
      if(!await isOwner(request,env))return error("Unauthorized",401);
      const {results}=await env.DB.prepare("SELECT * FROM poems ORDER BY updated_at DESC").all();
      return json({poems:results});
    }
    if(op==="backup"){
      if(!await isOwner(request,env))return error("Unauthorized",401);
      const hasCollections=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='collections'").first();
      const queries=[
        env.DB.prepare("SELECT * FROM poems ORDER BY created_at ASC"),
        env.DB.prepare("SELECT id,poem_id,media_type,base64,created_at FROM covers ORDER BY created_at ASC"),
        env.DB.prepare("SELECT * FROM poem_revisions ORDER BY poem_id,version")
      ];
      // Older databases can still export their complete pre-collection archive.
      // The additive fields are emitted together only when migration 0004 exists.
      if(hasCollections)queries.push(env.DB.prepare("SELECT * FROM collections ORDER BY created_at,id"),env.DB.prepare("SELECT * FROM collection_items ORDER BY collection_id,position"));
      const [{results:poems},{results:covers},{results:revisions},collectionRows,itemRows]=await env.DB.batch(queries);
      const extra=hasCollections?{collections:collectionRows.results,collection_items:itemRows.results}:{};
      return json({format:"poetry-gallery-backup-v2",completeness:"all poems, revisions and inline covers"+(hasCollections?", collections and ordered membership":""),exported_at:new Date().toISOString(),poems,covers,revisions,...extra});
    }
    if(op==="cover") {
      const id=url.searchParams.get("id")||"";
      if(!/^[a-f0-9-]{36}$/.test(id))return error("Not found",404);
      const cover=await env.DB.prepare("SELECT c.base64,c.media_type,p.status FROM covers c INNER JOIN poems p ON p.id=c.poem_id WHERE c.id=? AND p.cover_id=c.id").bind(id).first();
      if(!cover)return error("Not found",404);
      if(cover.status!=="published"){
        if(!await isOwner(request,env))return error("Not found",404);
      }
      const binary=atob(cover.base64);
      const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      return new Response(bytes,{status:200,headers:{"content-type":cover.media_type,
        "cache-control":"private, no-store","x-content-type-options":"nosniff"}});
    }
    return error("Unknown action",404);
  }
  if(request.method!=="POST")return error("Method not allowed",405);
  let body;
  try{body=await parseBody(request);}catch{return error("Invalid JSON",400);}
  if(op==="logout")return json({owner:false}); // Browser discards its in-memory capability.
  if(!await isOwner(request,env))return error("Unauthorized",401);
  if(op==="collection-save") {
    const id=body.id||body.localId||crypto.randomUUID();
    const title=typeof body.title==='string'?body.title.trim():'';
    const intro=typeof body.intro==='string'?body.intro:'';
    const cover=typeof body.cover==='string'?body.cover:'';
    const status=body.status||'draft',ids=body.poem_ids;
    if(!uuid.test(id)||!title||title.length>120||intro.length>5000||cover.length>2000||
      (cover&&!/^https:\/\//.test(cover))||!['draft','published'].includes(status)||
      !Array.isArray(ids)||ids.length>500||ids.some(x=>typeof x!=='string'||!uuid.test(x))||new Set(ids).size!==ids.length)
      return error("诗集字段或诗作顺序无效");
    if(body.id&&(!Number.isInteger(body.version)||body.version<1))return error("更新诗集需要当前版本");
    // Validate every member before touching collection metadata. The foreign keys
    // and D1 batch transaction also reject a concurrent poem deletion atomically.
    for(const poemId of ids)if(!await env.DB.prepare("SELECT id FROM poems WHERE id=?").bind(poemId).first())return error("诗作不存在",400);
    const stamp=crypto.randomUUID(),date=new Date().toISOString();
    const commands=[body.id
      ? env.DB.prepare("UPDATE collections SET title=?,intro=?,cover=?,status=?,updated_at=?,mutation_id=?,version=version+1 WHERE id=? AND version=?").bind(title,intro,cover,status,date,stamp,id,body.version)
      : env.DB.prepare("INSERT INTO collections(id,title,intro,cover,status,version,mutation_id,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,title,intro,cover,status,stamp,date,date),
      env.DB.prepare("DELETE FROM collection_items WHERE collection_id=? AND EXISTS(SELECT 1 FROM collections WHERE id=? AND mutation_id=?)").bind(id,id,stamp),
      ...ids.map((poemId,position)=>env.DB.prepare("INSERT INTO collection_items(collection_id,poem_id,position) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM collections WHERE id=? AND mutation_id=?)").bind(id,poemId,position,id,stamp))
    ];
    const results=await env.DB.batch(commands);
    if(!results[0].meta.changes)return error("诗集版本冲突，请重新读取；本机修改仍保留。",409);
    return json({id,version:body.id?body.version+1:1});
  }
  if(op==="collection-delete") {
    if(!uuid.test(body.id||'')||body.confirm!==true||!Number.isInteger(body.version)||body.version<1)return error("删除诗集需要确认及当前版本");
    const result=await env.DB.prepare("DELETE FROM collections WHERE id=? AND version=?").bind(body.id,body.version).run();
    if(!result.meta.changes)return error("诗集已变更或不存在",409);
    return json({deleted:true}); // Only membership cascades; poems remain untouched.
  }
  if(op==="save"||op==="restore") {
    let old=null,restoredCover;
    if(body.id){
      old=await env.DB.prepare("SELECT * FROM poems WHERE id=?").bind(String(body.id)).first();
      if(!old)return error("Not found",404);
      if(body.version!==old.version)return error("云端已有新版本，请重新打开云端作品。当前本机修改仍保留，可导出。",409);
    }
    if(op==="restore"){
      if(!old)return error("Not found",404);
      const revision=await env.DB.prepare("SELECT * FROM poem_revisions WHERE poem_id=? AND version=?").bind(old.id,body.revision).first();
      if(!revision)return error("Revision not found",404);
      restoredCover=revision.cover_id;
      body={...revision,id:old.id,version:old.version};
    }
    let p;try{p=inputPoem(body);}catch(e){return error(e.message);}
    if(body.localId!==undefined&&!uuid.test(body.localId))return error("Invalid localId");
    const id=old?.id||body.localId||crypto.randomUUID(),date=new Date().toISOString();
    const matches=row=>["title","author","body","genre","note","status"].every(k=>(row[k]||"")===p[k])&&(row.composed_on||null)===p.composed;
    if(old){
      const cover=op==="restore"?restoredCover:old.cover_id;
      const unchanged=matches(old)&&(old.cover_id||null)===(cover||null);
      if(unchanged)return json({id,version:old.version});
      // A single conditional UPDATE plus trigger makes revision + write atomic even for concurrent requests.
      const result=await env.DB.prepare("UPDATE poems SET title=?,author=?,body=?,genre=?,note=?,composed_on=?,status=?,updated_at=?,published_at=?,cover_id=?,version=version+1 WHERE id=? AND version=?")
        .bind(p.title,p.author,p.body,p.genre,p.note,p.composed,p.status,date,p.status==="published"?(old.published_at||date):null,cover,id,old.version).run();
      if(!result.meta.changes)return error("云端版本冲突；本机修改仍保留。",409);
      return json({id,version:old.version+1});
    }
    await env.DB.prepare("INSERT INTO poems(id,title,author,body,genre,note,composed_on,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING")
      .bind(id,p.title,p.author,p.body,p.genre,p.note,p.composed,p.status,date,date,p.status==="published"?date:null).run();
    const created=await env.DB.prepare("SELECT * FROM poems WHERE id=?").bind(id).first();
    if(!created||!matches(created))return error("此本机草稿已保存为不同内容，请重新读取云端版本。本机修改仍保留。",409);
    return json({id,version:created.version});
  }
  if(op==="delete") {
    const id=String(body.id||"");
    if(!/^[a-f0-9-]{36}$/.test(id))return error("Invalid id");
    if(body.confirm!==true||!Number.isInteger(body.version)||body.version<1)return error("删除需要确认及当前版本");
    const result=await env.DB.prepare("DELETE FROM poems WHERE id=? AND version=?").bind(id,body.version).run();
    if(!result.meta.changes)return error("作品已变更或不存在，请重新读取后确认删除。",409);
    return json({deleted:true});
  }
  if(op==="upload") {
    const id=String(body.poem_id||""),mime=String(body.mime||"");
    const b64=String(body.base64||"");
    if(!/^[a-f0-9-]{36}$/.test(id)||mime!=="image/jpeg"||!b64||
       b64.length>800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))
      return error("Invalid cover");
    let bytes;
    try{bytes=atob(b64);}catch{return error("Invalid image encoding");}
    if(bytes.length>550000||bytes.length<10||
      bytes.charCodeAt(0)!==255||bytes.charCodeAt(1)!==216||bytes.charCodeAt(2)!==255)
      return error("Only compressed JPEG photos up to 550 KB are supported");
    if(!Number.isInteger(body.version)||body.version<1)return error("上传需要当前作品版本");
    const coverId=crypto.randomUUID(),date=new Date().toISOString();
    const commands=[
      env.DB.prepare("INSERT INTO covers(id,poem_id,media_type,base64,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM poems WHERE id=? AND version=?)")
        .bind(coverId,id,mime,b64,date,id,body.version),
      env.DB.prepare("UPDATE poems SET cover_id=?,updated_at=?,version=version+1 WHERE id=? AND version=?")
        .bind(coverId,date,id,body.version)
    ];
    // Keep former cover bytes for complete history backups; poem deletion cascades.
    const results=await env.DB.batch(commands);
    if(!results[1].meta.changes)return error("作品版本冲突，请重新读取后上传。本机图片未更改。",409);
    return json({cover_id:coverId,version:body.version+1});
  }
  return error("Unknown action",404);
}
function allowedOrigins(env){
  return ["https://shici.byliyz.com","https://shici-archive.vercel.app","http://localhost:8787","http://localhost:8080",...(env.OWNER_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean)];
}
export default {
  async fetch(request,env) {
    const op=new URL(request.url).searchParams.get("op")||"list";
    const publicRead=["health","list","detail","cover","collections","collection-detail"].includes(op)&&!request.headers.has("authorization");
    const origin=request.headers.get("origin");
    const permitted=origin&&allowedOrigins(env).includes(origin);
    if(request.method==="OPTIONS"){
      if(!publicRead&&!permitted)return error("Origin rejected",403);
      return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":permitted?origin:"*","Access-Control-Allow-Methods":publicRead?"GET, OPTIONS":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"authorization, content-type","Vary":"Origin"}});
    }
    let response;
    try{response=await handler(request,env);}
    catch{response=error("Internal error",500);}
    response=new Response(response.body,response);
    if(permitted||publicRead)response.headers.set("Access-Control-Allow-Origin",permitted?origin:"*");
    response.headers.set("Vary","Origin");
    return response;
  }
};
