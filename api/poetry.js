// Compatibility proxy to the canonical Worker. Forward only caller credentials.
module.exports = async function handler(req,res) {
  const base="https://poetry-gallery-api.tasconyeric.workers.dev";
  res.setHeader("cache-control","no-store");
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
      redirect:"error",signal:AbortSignal.timeout(15000),
      headers:{
        "content-type":"application/json",
        "authorization":req.headers.authorization||"",
        "origin":origin||"https://shici.byliyz.com"},
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
