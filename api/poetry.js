// Same-origin gateway. Do NOT expose the Cloudflare gateway secret to browsers.
module.exports = async function handler(req,res) {
  const base=process.env.POETRY_WORKER_URL;
  const key=process.env.POETRY_GATEWAY_KEY;
  if(!base||!key||!/^https:\/\/[a-z0-9.-]+\/?$/.test(base)) {
    return res.status(503).json({error:"Poetry backend not configured"});
  }
  if(!["GET","POST"].includes(req.method)) return res.status(405).json({error:"Method not allowed"});
  const origin=req.headers.origin;
  if(req.method==="POST") {
    try {
      if(origin&&new URL(origin).host!==req.headers.host) return res.status(403).json({error:"Cross-site request rejected"});
    } catch {return res.status(403).json({error:"Invalid origin"});}
    if(!String(req.headers["content-type"]||"").startsWith("application/json"))
      return res.status(415).json({error:"JSON required"});
  }
  const params=new URLSearchParams();
  const op=Array.isArray(req.query?.op)?req.query.op[0]:req.query?.op;
  if(op)params.set("op",String(op));
  if(req.query?.id&&req.method==="GET")params.set("id",String(req.query.id));
  try {
    const upstream=await fetch(base.replace(/\/$/,"")+"/?"+params.toString(),{
      method:req.method,
      headers:{"x-poetry-gateway-key":key,
        "content-type":"application/json",
        "cookie":req.headers.cookie||""},
      body:req.method==="POST"?JSON.stringify(req.body||{}):undefined
    });
    res.status(upstream.status);
    for(const h of ["content-type","cache-control","set-cookie","x-content-type-options"]){
      const value=upstream.headers.get(h);
      if(value)res.setHeader(h,value);
    }
    res.setHeader("cache-control","no-store");
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(502).json({error:"Backend connection unavailable"});
  }
};
