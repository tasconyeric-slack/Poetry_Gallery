// Public capability flag only. Worker URL and shared gateway key remain SERVER-ONLY.
module.exports = function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  res.status(200).json({configured:Boolean(process.env.POETRY_WORKER_URL&&process.env.POETRY_GATEWAY_KEY),backend:"d1"});
};
