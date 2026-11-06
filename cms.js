// Owner capability stays in this module's memory only. Local content never includes it.
const $=id=>document.getElementById(id),form=$("poem-form");
const PUBLIC_API="https://poetry-gallery-api.tasconyeric.workers.dev";
const fields=["title","author","body","genre","note","composed_on"];
let token="",ownPoems=[],current=null,saving=false,coverURL=null;
const feedback=msg=>{$("admin-feedback").textContent=msg;};
const status=msg=>{$("admin-status").textContent=msg;};
const get=name=>String(form.elements.namedItem(name).value||"");
const put=(name,v)=>{form.elements.namedItem(name).value=v??"";};
let drafts=[];
try{drafts=JSON.parse(localStorage.getItem("poetry-drafts-v2")||"[]");if(!Array.isArray(drafts))drafts=[];}catch{feedback("无法读取本机草稿，请检查浏览器存储权限。");}
async function api(op,body,extras=""){
 const res=await fetch(PUBLIC_API+"/?op="+encodeURIComponent(op)+(extras?"&"+extras:""),{
  method:body===undefined?"GET":"POST",credentials:"omit",cache:"no-store",
  headers:{authorization:"Bearer "+token,...(body===undefined?{}:{"content-type":"application/json"})},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw Error(data.error||"HTTP "+res.status);return data;
}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function persist(){
 try{localStorage.setItem("poetry-drafts-v2",JSON.stringify(drafts));return true;}
 catch{feedback("本机保存失败（存储空间或权限不足），请立即导出草稿。");return false;}
}
function snapshot(){return {...current,...Object.fromEntries(fields.map(n=>[n,get(n)]))};}
function autosave(){
 if(!current||saving)return;
 current={...snapshot(),dirty:true,local_updated_at:new Date().toISOString()};
 drafts=drafts.filter(p=>p.localId!==current.localId);drafts.unshift(current);
 if(persist())$("editor-state").textContent="本机已自动保存 · 尚未同步云端 · "+new Date().toLocaleTimeString();
 preview();renderList();
}
function preview(){ $("poem-preview").textContent=[get("title"),get("author"),get("body"),get("note")].join("\n\n"); }
function resetEditor(){
 current={localId:crypto.randomUUID(),id:null,version:null,status:"draft"};form.reset();
 fields.forEach(n=>current[n]=get(n));
 $("editor-heading").textContent="写一首诗";$("editor-state").textContent="本机草稿 · 尚未同步云端";
 $("delete-poem").hidden=true;$("admin-cover-preview").hidden=true;$("revision-list").replaceChildren();preview();
}
function renderList(){
 const localIds=new Set(drafts.filter(p=>p.id).map(p=>p.id));
 const items=[...drafts,...ownPoems.filter(p=>!localIds.has(p.id))];
 const q=$("owner-search").value.toLowerCase(),genre=$("owner-genre").value,year=$("owner-year").value.trim();
 const filtered=items.filter(p=>[p.title,p.body,p.author].join(" ").toLowerCase().includes(q)&&(!genre||p.genre===genre)&&(!year||(p.composed_on||p.updated_at||p.local_updated_at||"").startsWith(year)));
 $("admin-list").replaceChildren();
 for(const p of filtered){
  const b=document.createElement("button");b.type="button";b.className="admin-item";
  const t=document.createElement("strong"),st=document.createElement("small");t.textContent=p.title||"未命名草稿";
  st.textContent=(p.dirty||!p.id?"本机未同步":p.status==="published"?"已发布":"云端草稿")+" · "+(p.local_updated_at||p.updated_at||"").slice(0,16);
  b.append(t,st);b.onclick=()=>{if(!saving)void openPoem(p);};$("admin-list").append(b);
 }
}
async function loadPoems(){ownPoems=(await api("owner-list")).poems||[];renderList();}
async function openPoem(p){
 autosaveIfChanged();current={...p,localId:p.localId||crypto.randomUUID()};
 fields.forEach(n=>put(n,p[n]));$("editor-heading").textContent="编辑作品";
 $("editor-state").textContent=p.dirty||!p.id?"本机草稿 · 尚未同步":p.status==="published"?"云端已保存 · 已发布":"云端已保存 · 私有草稿";
 $("delete-poem").hidden=false;$("admin-cover-preview").hidden=true;preview();$("revision-list").replaceChildren();
 if(coverURL){URL.revokeObjectURL(coverURL);coverURL=null;}
 if(p.cover_id&&token){try{const r=await fetch(PUBLIC_API+"/?op=cover&id="+encodeURIComponent(p.cover_id),{headers:{authorization:"Bearer "+token}});if(r.ok&&current?.localId===(p.localId||current.localId)){coverURL=URL.createObjectURL(await r.blob());$("admin-cover-preview").src=coverURL;$("admin-cover-preview").hidden=false;}}catch{}}
 if(p.id&&token)try{
  const {revisions}=await api("revisions",undefined,"id="+encodeURIComponent(p.id));if(current?.id!==p.id)return;
  for(const r of revisions){
   const detail=document.createElement("details"),label=document.createElement("summary"),pre=document.createElement("pre"),button=document.createElement("button");
   label.textContent="版本 "+r.version+" · "+r.saved_at;pre.textContent=[r.title,r.author,r.body,r.note].join("\n\n");button.type="button";button.textContent="恢复为新版本";
   button.onclick=async()=>{if(saving||!confirm("恢复此版本？当前内容会保留在修订历史。本机修改请先保存或导出。"))return;await save("restore",{revision:r.version});};
   detail.append(label,pre,button);$("revision-list").append(detail);
  }
 }catch(e){feedback("历史读取失败："+e.message);}
}
function autosaveIfChanged(){if(current&&fields.some(n=>get(n)!==(current[n]||"")))autosave();}
form.addEventListener("input",()=>autosave()); // immediate writes also survive fast reloads and mobile backgrounding
async function save(op="save",extra={}){
 if(saving)return;
 autosaveIfChanged();
 if(!token){autosave();feedback("已保存在本机。请先解锁作者权限，再保存到云端或发布。");$("owner-token").focus();return;}
 const outgoing={...snapshot(),...extra};saving=true;form.querySelectorAll("input,textarea,select,button").forEach(b=>b.disabled=true);
 try{
  const result=await api(op,outgoing);current={...outgoing,id:result.id,version:result.version,dirty:false};
  drafts=drafts.filter(p=>p.localId!==current.localId);drafts.unshift(current);persist();
  await loadPoems();const remote=ownPoems.find(p=>p.id===result.id);if(remote){current={...remote,localId:current.localId,dirty:false};drafts=drafts.map(p=>p.localId===current.localId?current:p);persist();}
  await openPoem(current);await refreshGallery();feedback("云端已保存 · "+(current.status==="published"?"已发布，可在公开诗集分享":"私有草稿"));
 }catch(e){feedback("同步失败："+e.message+" 本机草稿保留；可重试或导出。若冲突，请导出本机修改后重读云端列表。");}
 finally{saving=false;form.querySelectorAll("input,textarea,select,button").forEach(b=>b.disabled=false);}
}
form.addEventListener("submit",e=>{e.preventDefault();void save("save",{status:e.submitter?.dataset.saveStatus||"draft"});});
$("unlock-owner").onclick=async()=>{token=$("owner-token").value.trim();$("owner-token").value="";try{await api("session");await loadPoems();status("作者权限已解锁 · 令牌刷新即清除");$("login-form").hidden=true;}catch(e){token="";feedback(e.message);}};
$("sign-out").onclick=()=>{if(saving)return;token="";ownPoems=[];$("login-form").hidden=false;status("本机模式 · 云端权限已锁定");resetEditor();renderList();};
$("new-poem").onclick=()=>{if(saving)return;autosaveIfChanged();resetEditor();form.elements.title.focus();};
$("export-local").onclick=()=>{autosaveIfChanged();download({format:"poetry-device-drafts-v2",drafts},"poetry-device-drafts.json");};
$("export-backup").onclick=async()=>{try{if(!token)throw Error("请先解锁云端");download(await api("backup"),"poetry-complete-archive.json");feedback("完整私有备份已导出，包含草稿、历史和图片；请安全保存。");}catch(e){feedback(e.message);}};
$("reload-cloud").onclick=async()=>{if(saving)return;try{await loadPoems();if(current?.id&&confirm("本机修改保留在列表，打开最新云端版本？")){const p=ownPoems.find(p=>p.id===current.id);if(p)await openPoem(p);}}catch(e){feedback(e.message);}};
for(const id of ["owner-search","owner-genre","owner-year"])$(id).oninput=renderList;
function mutationBusy(value){saving=value;$("admin-workspace").querySelectorAll("button,input,textarea,select").forEach(el=>el.disabled=value);}
$("delete-poem").onclick=async()=>{
 if(saving||!current||!confirm("删除此作品及云端修订历史？此操作不可撤销，请先导出备份。"))return;
 const target={...current};mutationBusy(true);
 try{if(target.id){if(!token)throw Error("云端作品需要作者权限才能删除");await api("delete",{id:target.id});ownPoems=ownPoems.filter(p=>p.id!==target.id);}
 drafts=drafts.filter(p=>p.localId!==target.localId&&(!target.id||p.id!==target.id));persist();resetEditor();renderList();await refreshGallery();feedback("作品已删除。");}catch(e){feedback(e.message);}finally{mutationBusy(false);}
};
async function publicApi(op,extra=""){
  const response=await fetch(PUBLIC_API+"/?op="+encodeURIComponent(op)+extra,{
    method:"GET",mode:"cors",credentials:"omit",cache:"no-store"
  });
  if(!response.ok){const error=Error("Public archive unavailable");error.status=response.status;throw error;}
  return response.json();
}
const image=id=>id?PUBLIC_API+"/?op=cover&id="+encodeURIComponent(id):null;
const ownerImage=id=>id?"/api/poetry?op=cover&id="+encodeURIComponent(id):null;
function forGallery(p){return {id:p.id,title:p.title,author:p.author||"作者未署名",dynasty:"原创",
  genre:p.genre,lines:p.body.split("\n"),note:p.note||"",composedOn:p.composed_on||"",coverUrl:image(p.cover_id),demo:false};}
window.poetryGallery.loadDetail=async id=>forGallery((await publicApi("detail","&id="+encodeURIComponent(id))).poem);
async function refreshGallery(){
  window.poetryGallery.setStatus("正在读取公开诗集…");
  try{
    const result=await publicApi("list");
    if(!Array.isArray(result.poems))throw Error("Invalid archive response");
    window.poetryGallery.setPublished(result.poems.map(forGallery),false);
    window.poetryGallery.setStatus(result.poems.length?"":"尚无已发布的原创诗作。可选择下方古典示例预览阅读与分享。");
  }catch{
    window.poetryGallery.setPublished([],false);
    window.poetryGallery.setStatus("暂时无法连接原创诗集。请重试，或选择古典示例预览。");
  }
}
$("show-examples").addEventListener("click",()=>window.poetryGallery.showExamples());
$("retry-archive").addEventListener("click",()=>void refreshGallery());
async function compress(file){
  if(!file.type.startsWith("image/")||file.size>8*1024*1024)
    throw Error("请选择 8 MB 以下的图片。");
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error("无法读取图片"));img.src=url;});
    if(img.width*img.height>40000000)throw Error("图片尺寸过大。");
    let size=1200;
    for(let i=0;i<6;i++){
      const scale=Math.min(1,size/Math.max(img.width,img.height)),canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(img.width*scale));
      canvas.height=Math.max(1,Math.round(img.height*scale));
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      const base64=canvas.toDataURL("image/jpeg",.7).split(",")[1];
      if(base64.length<=720000)return base64;
      size=Math.round(size*.75);
    }
    throw Error("图片压缩后仍太大。");
  }finally{URL.revokeObjectURL(url);}
}
$("upload-cover").onclick=async()=>{
 if(saving)return;
 if(!current?.id||!token)return feedback("请先解锁并保存到云端。");
 autosaveIfChanged();if(current.dirty)return feedback("请先将当前文字保存到云端，再上传配图，避免丢失本机修改。");
 const file=$("cover-upload").files?.[0];if(!file)return feedback("请选择图片。");
 const target={...current};mutationBusy(true);
 try{await api("upload",{poem_id:target.id,mime:"image/jpeg",base64:await compress(file)});await loadPoems();await openPoem({...ownPoems.find(p=>p.id===target.id),localId:target.localId});await refreshGallery();feedback("配图已上传。");}catch(e){feedback(e.message);}finally{mutationBusy(false);}
};
resetEditor();$("admin-workspace").hidden=false;$("login-form").hidden=false;
status("本机模式 · 输入自动保存，云端需要作者权限");renderList();
if(drafts[0])void openPoem(drafts[0]);
window.poetryDraftForVideo=()=>({...snapshot(),lines:get("body").split("\n"),demo:false});
void refreshGallery();

$("draft-video").onclick=async()=>{
 autosaveIfChanged();
 try{const {openVideoStudio}=await import("./video-studio.js");await openVideoStudio(window.poetryDraftForVideo());}
 catch(e){feedback("视频工作室加载失败："+e.message);}
};
