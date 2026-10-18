// Poetry Gallery only: Cloudflare D1, single-owner SMS authentication.
// All requests MUST come via the same-origin Vercel gateway with its shared secret.
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{
  status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}
});
const now=()=>Math.floor(Date.now()/1000);
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function digest(data) {
  return hex(await crypto.subtle.digest("SHA-256",encoder.encode(data)));
}
async function hmac(key,message) {
  const raw=typeof key==="string"?encoder.encode(key):key;
  const k=await crypto.subtle.importKey("raw",raw,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",k,encoder.encode(message)));
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
async function sendTencentSms(env,phone,code) {
  for(const k of ["TENCENT_SECRET_ID","TENCENT_SECRET_KEY","TENCENT_SMS_APP_ID","TENCENT_SMS_SIGN","TENCENT_SMS_TEMPLATE"])
    if(!env[k])throw Error("SMS provider not configured");
  const timestamp=now();
  const day=new Date(timestamp*1000).toISOString().slice(0,10);
  const payload=JSON.stringify({
    PhoneNumberSet:[phone],SmsSdkAppId:env.TENCENT_SMS_APP_ID,
    SignName:env.TENCENT_SMS_SIGN,TemplateId:env.TENCENT_SMS_TEMPLATE,
    TemplateParamSet:[code,"5"]
  });
  const host="sms.tencentcloudapi.com",service="sms",scope=day+"/"+service+"/tc3_request";
  const canonical="POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:"+host+"\n\ncontent-type;host\n"+await digest(payload);
  const signText="TC3-HMAC-SHA256\n"+timestamp+"\n"+scope+"\n"+await digest(canonical);
  const keyDate=await hmac("TC3"+env.TENCENT_SECRET_KEY,day);
  const keyService=await hmac(keyDate,service);
  const keySigning=await hmac(keyService,"tc3_request");
  const signature=hex(await hmac(keySigning,signText));
  const authorization="TC3-HMAC-SHA256 Credential="+env.TENCENT_SECRET_ID+"/"+scope+
    ", SignedHeaders=content-type;host, Signature="+signature;
  const res=await fetch("https://"+host,{
    method:"POST",headers:{"content-type":"application/json; charset=utf-8",
      "x-tc-action":"SendSms","x-tc-version":"2021-01-11","x-tc-region":"ap-guangzhou",
      "x-tc-timestamp":String(timestamp),"authorization":authorization},
    body:payload
  });
  const result=await res.json();
  if(!res.ok||result.Response?.Error||result.Response?.SendStatusSet?.[0]?.Code!=="Ok")
    throw Error("SMS delivery rejected by provider");
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
  if(!env.DB||!env.GATEWAY_KEY||!env.OWNER_PHONE||!env.OTP_PEPPER)
    return error("Backend setup incomplete",503);
  if(request.headers.get("x-poetry-gateway-key")!==env.GATEWAY_KEY)
    return error("Forbidden",403);
  const url=new URL(request.url);
  const op=url.searchParams.get("op")||"list";
  if(request.method==="GET") {
    if(op==="list") {
      const {results}=await env.DB.prepare("SELECT id,title,body,genre,note,status,composed_on,published_at,cover_id FROM poems WHERE status='published' ORDER BY published_at DESC").all();
      return json({poems:results});
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
      if(!cover||cover.status!=="published"&&!await isOwner(request,env))return error("Not found",404);
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
  if(op==="send") {
    const phone=String(body.phone||"").trim();
    if(!/^\+[1-9]\d{7,14}$/.test(phone)||phone!==env.OWNER_PHONE)
      return error("This number is not authorized",403);
    if(!env.TENCENT_SECRET_ID||!env.TENCENT_SECRET_KEY||
       !env.TENCENT_SMS_APP_ID||!env.TENCENT_SMS_SIGN||!env.TENCENT_SMS_TEMPLATE)
      return error("SMS provider not yet configured",503);
    const time=now(),day=new Date().toISOString().slice(0,10);
    await env.DB.prepare("INSERT OR IGNORE INTO sms_requests(phone) VALUES(?)").bind(phone).run();
    const update=await env.DB.prepare(
      "UPDATE sms_requests SET sent_at=?,day=?,daily_count=CASE WHEN day=? THEN daily_count+1 ELSE 1 END "+
      "WHERE phone=? AND sent_at<? AND (day<>? OR daily_count<5)"
    ).bind(time,day,day,phone,time-60,day).run();
    if(update.meta.changes!==1)return error("请求过于频繁，请稍后再试",429);
    const random=crypto.getRandomValues(new Uint32Array(1))[0];
    const code=String(100000+(random%900000));
    const hash=await digest(phone+":"+code+":"+env.OTP_PEPPER);
    await env.DB.prepare("UPDATE sms_requests SET code_hash=?,expires_at=?,attempts=0 WHERE phone=?")
      .bind(hash,time+300,phone).run();
    try {await sendTencentSms(env,phone,code);}
    catch {return error("短信发送失败，请检查服务商配置",503);}
    return json({sent:true,expires_in:300});
  }
  if(op==="verify") {
    const phone=String(body.phone||""),code=String(body.code||"");
    if(phone!==env.OWNER_PHONE||!/^\d{6}$/.test(code))return error("验证码错误",401);
    const row=await env.DB.prepare("SELECT code_hash,expires_at,attempts FROM sms_requests WHERE phone=?").bind(phone).first();
    if(!row||!row.code_hash||row.expires_at<now()||row.attempts>=6)
      return error("验证码无效或已过期",401);
    const attempt=await env.DB.prepare("UPDATE sms_requests SET attempts=attempts+1 WHERE phone=? AND attempts<6").bind(phone).run();
    if(attempt.meta.changes!==1)return error("尝试次数过多",429);
    if(row.code_hash!==await digest(phone+":"+code+":"+env.OTP_PEPPER))return error("验证码错误",401);
    await env.DB.prepare("UPDATE sms_requests SET code_hash=NULL,expires_at=0 WHERE phone=?").bind(phone).run();
    const session=secretBytes(),time=now();
    await env.DB.prepare("INSERT INTO owner_sessions(token_hash,created_at,expires_at) VALUES(?,?,?)")
      .bind(await digest(session),time,time+60*60*24*60).run();
    return json({owner:true},200,{
      "set-cookie":"poetry_sid="+session+"; HttpOnly; Secure; SameSite=Lax; Path=/api/poetry; Max-Age=5184000"
    });
  }
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
    await env.DB.prepare("DELETE FROM poems WHERE id=?").bind(id).run();
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
    await env.DB.prepare("INSERT INTO covers(id,poem_id,media_type,base64,created_at) VALUES(?,?,?,?,?)")
      .bind(coverId,id,mime,b64,date).run();
    await env.DB.prepare("UPDATE poems SET cover_id=?,updated_at=? WHERE id=?")
      .bind(coverId,date,id).run();
    return json({cover_id:coverId});
  }
  return error("Unknown action",404);
}
export default {
  async fetch(request,env) {
    try{return await handler(request,env);}
    catch(err){console.error("Poetry API failure",err?.name||"unknown");return error("Internal error",500);}
  }
};
