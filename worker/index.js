// Poetry Gallery only: Cloudflare D1; public reading + owner APIs locked pending Passkey.
// Public published works are readable directly from Workers.dev; mutations stay gated.
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}
});
const now=()=>Math.floor(Date.now()/1000);
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function digest(data) {
  return hex(await crypto.subtle.digest("SHA-256",encoder.encode(data)));
}
function cookieToken(request) {
  const match=(request.headers.get("cookie")||"").match(/(?:^|;\s*)poetry_sid=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] || "";
}
async function isOwner(request,env) {
  const raw=cookieToken(request);
  if(!raw)return false;
  const record=await env.DB.prepare("SELECT expires_at FROM owner_sessions WHERE token_hash=?")
    .bind(await digest(raw)).first();
  return Boolean(record && record.expires_at>now());
}
function error(message,status=400){return json({error:message},status);}
function secretBytes() {
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return hex(bytes);
}
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
  const text=String(body.body||"").replace(/\r\n/g,"\n").trim();
  const genre=String(body.genre||"其他");
  const note=String(body.note||"").trim();
  const composed=body.composed_on?String(body.composed_on):null;
  if(!title||title.length>120||!text||text.length>30000||
    !["五言","七言","词","其他"].includes(genre)||note.length>5000||
    (composed&&!/^\d{4}-\d{2}-\d{2}$/.test(composed)))throw Error("诗作字段无效");
  return {title,body:text,genre,note,composed,status:body.status==="published"?"published":"draft"};
}
async function handler(request,env) {
  if(!env.DB) return error("Database unavailable",503);
  const url=new URL(request.url);
  const op=url.searchParams.get("op")||"list";
  const publicRead=request.method==="GET"&&["list","detail","cover","health"].includes(op);
  if(!publicRead){
    if(!env.GATEWAY_KEY||request.headers.get("x-poetry-gateway-key")!==env.GATEWAY_KEY)
      return error("Forbidden",403);
    if(env.ADMIN_AUTH_ENABLED!=="passkey") return error("Administrator login is not enabled",503);
  }
  if(request.method==="GET") {
    if(op==="health") return json({ok:true,backend:"d1",auth:"pending"});
    if(op==="list") {
      const {results}=await env.DB.prepare("SELECT id,title,body,genre,note,composed_on,published_at,cover_id FROM poems WHERE status='published' ORDER BY published_at DESC").all();
      return json({poems:results});
    }
    if(op==="detail") {
      const id=url.searchParams.get("id")||"";
      if(!/^[a-f0-9-]{36}$/.test(id))return error("Not found",404);
      const poem=await env.DB.prepare("SELECT id,title,body,genre,note,composed_on,published_at,cover_id FROM poems WHERE id=? AND status='published'").bind(id).first();
      return poem?json({poem}):error("Not found",404);
    }
    if(op==="session")return json({owner:await isOwner(request,env)});
    if(op==="owner-list"){
      if(!await isOwner(request,env))return error("Unauthorized",401);
      const {results}=await env.DB.prepare("SELECT * FROM poems ORDER BY updated_at DESC").all();
      return json({poems:results});
    }
    if(op==="cover") {
      const id=url.searchParams.get("id")||"";
      if(!/^[a-f0-9-]{36}$/.test(id))return error("Not found",404);
      const cover=await env.DB.prepare("SELECT c.base64,c.media_type,p.status FROM covers c INNER JOIN poems p ON p.id=c.poem_id WHERE c.id=? AND p.cover_id=c.id").bind(id).first();
      if(!cover)return error("Not found",404);
      if(cover.status!=="published"){
        if(!env.GATEWAY_KEY||request.headers.get("x-poetry-gateway-key")!==env.GATEWAY_KEY
          ||env.ADMIN_AUTH_ENABLED!=="passkey"||!await isOwner(request,env))
          return error("Not found",404);
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
  if(op==="logout") {
    const token=cookieToken(request);
    if(token)await env.DB.prepare("DELETE FROM owner_sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({owner:false},200,{"set-cookie":"poetry_sid=; HttpOnly; Secure; SameSite=Lax; Path=/api/poetry; Max-Age=0"});
  }
  if(!await isOwner(request,env))return error("Unauthorized",401);
  if(op==="save") {
    let p;try{p=inputPoem(body);}catch(e){return error(e.message);}
    const id=typeof body.id==="string"&&/^[a-f0-9-]{36}$/.test(body.id)?body.id:null;
    const date=new Date().toISOString();
    if(id) {
      const old=await env.DB.prepare("SELECT published_at FROM poems WHERE id=?").bind(id).first();
      if(!old)return error("Not found",404);
      await env.DB.prepare("UPDATE poems SET title=?,body=?,genre=?,note=?,composed_on=?,status=?,updated_at=?,published_at=? WHERE id=?")
        .bind(p.title,p.body,p.genre,p.note,p.composed,p.status,date,p.status==="published"?(old.published_at||date):null,id).run();
      return json({id});
    }
    const newid=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO poems(id,title,body,genre,note,composed_on,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(newid,p.title,p.body,p.genre,p.note,p.composed,p.status,date,date,p.status==="published"?date:null).run();
    return json({id:newid});
  }
  if(op==="delete") {
    const id=String(body.id||"");
    if(!/^[a-f0-9-]{36}$/.test(id))return error("Invalid id");
    await env.DB.batch([
      env.DB.prepare("DELETE FROM covers WHERE poem_id=?").bind(id),
      env.DB.prepare("DELETE FROM poems WHERE id=?").bind(id)
    ]);
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
    if(!await env.DB.prepare("SELECT id FROM poems WHERE id=?").bind(id).first())
      return error("Poem not found",404);
    const coverId=crypto.randomUUID(),date=new Date().toISOString();
    const old=await env.DB.prepare("SELECT cover_id FROM poems WHERE id=?").bind(id).first();
    const commands=[
      env.DB.prepare("INSERT INTO covers(id,poem_id,media_type,base64,created_at) VALUES(?,?,?,?,?)")
        .bind(coverId,id,mime,b64,date),
      env.DB.prepare("UPDATE poems SET cover_id=?,updated_at=? WHERE id=?")
        .bind(coverId,date,id)
    ];
    if(old?.cover_id)commands.push(env.DB.prepare("DELETE FROM covers WHERE id=?").bind(old.cover_id));
    await env.DB.batch(commands);
    return json({cover_id:coverId});
  }
  return error("Unknown action",404);
}
export default {
  async fetch(request,env) {
    const path=new URL(request.url);
    const op=path.searchParams.get("op")||"list";
    const publicRead=request.method==="GET"&&["health","list","detail","cover"].includes(op);
    if(request.method==="OPTIONS"&&["health","list","detail","cover"].includes(op)) {
      return new Response(null,{status:204,headers:{
        "Access-Control-Allow-Origin":"*",
        "Access-Control-Allow-Methods":"GET, OPTIONS",
        "Access-Control-Max-Age":"86400"
      }});
    }
    let response;
    try{response=await handler(request,env);}
    catch(err){console.error("Poetry API failure",err?.name||"unknown");response=error("Internal error",500);}
    if(publicRead){
      response=new Response(response.body,response);
      response.headers.set("Access-Control-Allow-Origin","*");
    }
    return response;
  }
};
