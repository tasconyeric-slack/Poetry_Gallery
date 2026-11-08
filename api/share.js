// Public crawler preview. Never forward owner credentials or serve private works.
const {randomBytes}=require('node:crypto');
const worker='https://poetry-gallery-api.tasconyeric.workers.dev';
const site='https://shici.byliyz.com';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=async function share(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).send('Method not allowed');
 const id=req.query?.id;
 const unavailable=()=>res.status(404).send(req.method==='HEAD'?'':'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>作品不存在或尚未发布</title><body>作品不存在或尚未发布</body></html>');
 if(typeof id!=='string'||!uuid.test(id))return unavailable();
 let poem;
 try{
  const upstream=await fetch(worker+'/?op=detail&id='+id,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
  if(!upstream.ok)return unavailable();
  poem=(await upstream.json()).poem;
  if(!poem||poem.id!==id||typeof poem.title!=='string'||typeof poem.body!=='string'||(poem.status!==undefined&&poem.status!=='published'))return unavailable();
 }catch{return unavailable();}
 const title=escapeHTML(poem.title),author=escapeHTML(poem.author||''),body=escapeHTML(poem.body);
 const description=escapeHTML((poem.author?poem.author+' · ':'')+poem.body.replace(/\s+/g,' ').slice(0,150));
 const canonical=site+'/p/'+id,reader='/#poem/'+id,nonce=randomBytes(18).toString('base64');
 const image=typeof poem.cover_id==='string'&&uuid.test(poem.cover_id)?worker+'/?op=cover&amp;id='+poem.cover_id:null;
 res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'`);
 const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · 诗词馆</title><meta name="description" content="${description}">
<link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="zh_CN"><meta property="og:site_name" content="诗词馆">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}">
${image?`<meta property="og:image" content="${image}"><meta property="og:image:alt" content="${title}">`:''}
<style>body{margin:10vh auto;padding:24px;max-width:660px;background:#faf9f6;color:#292725;font-family:serif}h1{font-size:30px}pre{white-space:pre-wrap;font:18px/2.2 serif}a{color:inherit}</style>
</head><body><article><h1>${title}</h1><p>${author}</p><pre>${body}</pre><a href="${reader}">打开诗作</a></article>
<script nonce="${nonce}">window.location.replace(${JSON.stringify(reader)});</script></body></html>`;
 return res.status(200).send(req.method==='HEAD'?'':html);
};
