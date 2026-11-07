// Public readiness from the same Worker used directly by the browser.
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  try{
    const response=await fetch("https://poetry-gallery-api.tasconyeric.workers.dev/?op=health",{redirect:"error",signal:AbortSignal.timeout(15000)});
    const health=await response.json();
    return res.status(response.ok?200:503).json({configured:response.ok&&health.ok===true&&health.auth==="owner-token",backend:"d1",auth:health.auth||"pending",schema:health.schema||"unknown"});
  }catch{return res.status(503).json({configured:false,backend:"d1",error:"Backend connection unavailable"});}
};
