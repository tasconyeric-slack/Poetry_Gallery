// Owner capability stays in this module's memory only. Local content never includes it.
const $=id=>document.getElementById(id),form=$("poem-form");
const PUBLIC_API="https://poetry-gallery-api.tasconyeric.workers.dev";
const fields=["title","author","body","genre","note","composed_on"];
let token="",ownPoems=[],current=null,saving=false,coverURL=null,saveError=false,localError=false;
let editorVersion=0,editorTouched=false;
const removedLocalIds=new Set();
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
 try{
  const disk=JSON.parse(localStorage.getItem("poetry-drafts-v2")||"[]");
  if(Array.isArray(disk))for(const p of disk){
   if(!removedLocalIds.has(p.localId)&&!drafts.some(d=>d.localId===p.localId))drafts.push(p);
  }
  localStorage.setItem("poetry-drafts-v2",JSON.stringify(drafts));localError=false;return true;}
 catch{localError=true;updateState();feedback("本机保存失败（存储空间或权限不足），请立即导出草稿。");return false;}
}
function snapshot(){return {...current,...Object.fromEntries(fields.map(n=>[n,get(n)]))};}
function updateState(){
 if(!current)return;
 $("editor-state").textContent=(navigator.onLine?"":"当前离线 · ")+(localError?"本机保存失败，请立即导出草稿":saving?"正在保存到云端…":saveError?"云端保存失败，需要重试 · 本机草稿保留":current.dirty||!current.id?"本机草稿，尚未上传"+(current.status==="published"?" · 云端旧版已发布":""):current.status==="published"?"云端保存成功 · 已发布":"云端保存成功 · 私有草稿");
 $("withdraw-poem").hidden=current.status!=="published"||!current.id;
 $("editor-public-link").hidden=current.status!=="published"||!current.id;
 $("editor-public-link").href="#poem/"+current.id;
}
window.addEventListener("offline",updateState);window.addEventListener("online",updateState);
function autosave(){
 if(!current||saving)return;
 editorTouched=true;
 current={...snapshot(),dirty:true,local_updated_at:new Date().toISOString()};
 drafts=drafts.filter(p=>p.localId!==current.localId);drafts.unshift(current);
 persist();updateState();
 preview();renderList();
}
function preview(){ $("poem-preview").textContent=[get("title"),get("author"),get("body"),get("note")].join("\n\n"); }
function resetEditor(){
 editorVersion++;editorTouched=false;saveError=false;
 if(coverURL){URL.revokeObjectURL(coverURL);coverURL=null;}
 current={localId:crypto.randomUUID(),id:null,version:null,status:"draft"};form.reset();
 fields.forEach(n=>current[n]=get(n));
 $("editor-heading").textContent="写一首诗";$("editor-state").textContent="本机草稿 · 尚未同步云端";
 $("delete-poem").hidden=true;$("admin-cover-preview").hidden=true;$("revision-list").replaceChildren();preview();updateState();
}
function renderList(){
 const localIds=new Set(drafts.filter(p=>p.id).map(p=>p.id));
 const items=[...drafts,...ownPoems.filter(p=>!localIds.has(p.id))];
 const q=$("owner-search").value.toLowerCase(),genre=$("owner-genre").value,year=$("owner-year").value.trim();
 const filtered=items.filter(p=>[p.title,p.body,p.author].join(" ").toLowerCase().includes(q)&&(!genre||p.genre===genre)&&(!year||(p.composed_on||p.updated_at||p.local_updated_at||"").startsWith(year)));
 $("admin-list").replaceChildren();
 for(const p of filtered){
  const row=document.createElement("div");row.className="admin-item";
  const b=document.createElement("button");b.type="button";b.className="admin-edit";
  const t=document.createElement("strong"),st=document.createElement("small");t.textContent=p.title||"未命名草稿";
  st.textContent=(p.dirty||!p.id?"本机未同步":p.status==="published"?"已发布":"云端草稿")+" · "+(p.local_updated_at||p.updated_at||"").slice(0,16);
  b.append(t,st);b.setAttribute("aria-label","继续编辑："+(p.title||"未命名草稿"));b.onclick=()=>{if(!saving)void openPoem(p);};row.append(b);
  if(p.status==="published"&&p.id){const link=document.createElement("a");link.href="#poem/"+p.id;link.textContent="阅读 / 分享";row.append(link);}
  $("admin-list").append(row);
 }
}
async function loadPoems(){ownPoems=(await api("owner-list")).poems||[];renderList();}
async function openPoem(p){
 autosaveIfChanged();const opened=++editorVersion;editorTouched=false;saveError=false;current={...p,localId:p.localId||crypto.randomUUID()};
 fields.forEach(n=>put(n,p[n]));$("editor-heading").textContent="编辑作品";
 $("editor-state").textContent=p.dirty||!p.id?"本机草稿 · 尚未同步":p.status==="published"?"云端已保存 · 已发布":"云端已保存 · 私有草稿";
 $("delete-poem").hidden=false;$("admin-cover-preview").hidden=true;$("cover-upload").value="";preview();updateState();$("revision-list").replaceChildren();
 if(coverURL){URL.revokeObjectURL(coverURL);coverURL=null;}
 if(p.cover_id&&token){try{const r=await fetch(PUBLIC_API+"/?op=cover&id="+encodeURIComponent(p.cover_id),{headers:{authorization:"Bearer "+token}});if(!r.ok)throw Error("配图读取失败");const blob=await r.blob();if(editorVersion===opened){coverURL=URL.createObjectURL(blob);$("admin-cover-preview").src=coverURL;$("admin-cover-preview").hidden=false;}}catch{if(editorVersion===opened)feedback("配图暂时无法读取，正文已保留，可重新打开重试。");}}
 if(p.id&&token)try{
  const {revisions}=await api("revisions",undefined,"id="+encodeURIComponent(p.id));if(editorVersion!==opened)return;
  for(const r of revisions){
   const detail=document.createElement("details"),label=document.createElement("summary"),pre=document.createElement("pre"),button=document.createElement("button");
   label.textContent="版本 "+r.version+" · "+r.saved_at;pre.textContent=[r.title,r.author,r.body,r.note].join("\n\n");button.type="button";button.textContent="恢复为新版本";
   button.onclick=async()=>{if(current?.dirty){feedback("请先保存当前修改到云端，再恢复历史版本；本机草稿已保留。");return;}if(saving||!confirm("恢复此版本？当前内容会保留在修订历史。本机修改请先保存或导出。"))return;await save("restore",{revision:r.version});};
   detail.append(label,pre,button);$("revision-list").append(detail);
  }
 }catch(e){feedback("历史读取失败："+e.message);}
}
function autosaveIfChanged(){if(current&&fields.some(n=>get(n)!==(current[n]||"")))autosave();}
form.addEventListener("input",()=>autosaveIfChanged()); // immediate writes also survive fast reloads and mobile backgrounding
async function save(op="save",extra={}){
 if(saving)return;
 autosaveIfChanged();
 if(!navigator.onLine){saveError=true;updateState();feedback("当前离线，本机草稿保留。联网后请重试保存。");return;}
 if(!token){autosave();feedback("已保存在本机。请先解锁作者权限，再保存到云端或发布。");document.querySelector(".cloud-access").open=true;$("owner-token").focus();return;}
 const outgoing={...snapshot(),...extra};saveError=false;mutationBusy(true);updateState();
 try{
  const result=await api(op,outgoing);current={...outgoing,id:result.id,version:result.version,dirty:false};
  drafts=drafts.filter(p=>p.localId!==current.localId);drafts.unshift(current);persist();
  if(op==="restore"){await loadPoems();const restored=ownPoems.find(p=>p.id===result.id);if(restored){current={...restored,localId:outgoing.localId,dirty:false};drafts=drafts.map(p=>p.localId===current.localId?current:p);persist();}}
  ownPoems=ownPoems.filter(p=>p.id!==current.id);ownPoems.unshift(current);renderList();
  await openPoem(current);await refreshGallery();feedback("云端已保存 · "+(current.status==="published"?"已发布，可在公开诗集分享":"私有草稿"));
 }catch(e){saveError=true;feedback("同步失败："+e.message+" 本机草稿保留；可重试或导出。若冲突，请导出本机修改后重读云端列表。");}
 finally{mutationBusy(false);updateState();}
}
form.addEventListener("submit",e=>{e.preventDefault();void save("save",{status:e.submitter?.id==="save-cloud"?(current?.status||"draft"):(e.submitter?.dataset.saveStatus||"draft")});});
$("unlock-owner").onclick=async()=>{token=$("owner-token").value.trim();$("owner-token").value="";try{await api("session");await loadPoems();status("作者权限已解锁 · 密钥刷新后需重新输入");$("login-form").hidden=true;}catch(e){token="";feedback(e.message);}};
$("sign-out").onclick=()=>{if(saving)return;token="";ownPoems=[];$("login-form").hidden=false;status("本机模式 · 云端权限已锁定");autosaveIfChanged();renderList();};
$("new-poem").onclick=()=>{if(saving)return;autosaveIfChanged();resetEditor();form.elements.title.focus();};
$("export-local").onclick=()=>{autosaveIfChanged();download({format:"poetry-device-drafts-v2",drafts},"poetry-device-drafts.json");};
$("export-backup").onclick=async()=>{try{if(!token)throw Error("请先解锁云端");download(await api("backup"),"poetry-complete-archive.json");feedback("完整私有备份已导出，包含草稿、历史和图片；请安全保存。");}catch(e){feedback(e.message);}};
$("reload-cloud").onclick=async()=>{if(saving)return;try{autosaveIfChanged();await loadPoems();if(current?.id&&confirm("本机修改保留在列表，打开最新云端版本？")){const p=ownPoems.find(p=>p.id===current.id);if(p){
 if(current.dirty){const recovery={...snapshot(),localId:crypto.randomUUID(),id:null,version:null,status:"draft",title:get("title")+"（本机保留）"};drafts=drafts.filter(d=>d.localId!==current.localId);removedLocalIds.add(current.localId);drafts.unshift(recovery);persist();}
 await openPoem({...p,localId:crypto.randomUUID()});
}}}catch(e){feedback(e.message);}};
for(const id of ["owner-search","owner-genre","owner-year"])$(id).oninput=renderList;
function mutationBusy(value){saving=value;$("admin-workspace").querySelectorAll("button,input,textarea,select").forEach(el=>el.disabled=value);}
$("delete-poem").onclick=async()=>{
 if(saving||!current||!confirm("删除此作品及云端修订历史？此操作不可撤销，请先导出备份。"))return;
 const target={...current};mutationBusy(true);
 try{if(target.id){if(!token)throw Error("云端作品需要作者权限才能删除");await api("delete",{id:target.id,version:target.version,confirm:true});ownPoems=ownPoems.filter(p=>p.id!==target.id);}
 removedLocalIds.add(target.localId);
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
 try{const result=await api("upload",{poem_id:target.id,version:target.version,mime:"image/jpeg",base64:await compress(file)});current={...target,cover_id:result.cover_id,version:result.version??target.version};drafts=drafts.map(p=>p.localId===target.localId?current:p);persist();ownPoems=ownPoems.map(p=>p.id===target.id?current:p);renderList();await openPoem(current);await refreshGallery();feedback("配图已上传。");}catch(e){feedback(e.message);}finally{mutationBusy(false);}
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

$("withdraw-poem").onclick=()=>{if(!saving&&confirm("撤回后，其他人将无法通过原链接阅读。确定撤回？"))void save("save",{status:"draft"});};
window.addEventListener("pagehide",autosaveIfChanged);
window.addEventListener("beforeunload",e=>{autosaveIfChanged();if(localError){e.preventDefault();e.returnValue="";}});
// A second tab must not silently replace this tab's working copy.
window.addEventListener("storage",e=>{
 if(e.key!=="poetry-drafts-v2"||saving)return;
 try{const incoming=JSON.parse(e.newValue||"[]");if(!Array.isArray(incoming))return;
 const other=incoming.find(p=>p.localId===current?.localId);
 if(other&&fields.some(n=>(other[n]||"")!==get(n))){
 if(!editorTouched){drafts=incoming;void openPoem(other);renderList();return;}current={...snapshot(),localId:crypto.randomUUID(),id:null,version:null,status:"draft",dirty:true};feedback("另一页面修改了草稿，当前文字已另存为本机副本，请确认后再上传。");}
 drafts=incoming;if(current&&!drafts.some(p=>p.localId===current.localId))autosave();else{renderList();updateState();}
 }catch{feedback("另一页面的草稿无法读取，当前文字仍保留。");}
});
$("import-poem").onclick=()=>{if(!saving){$("import-feedback").textContent="";$("import-dialog").showModal();}};
$("confirm-import").onclick=()=>{
 const raw=$("import-text").value.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
 if(!raw.trim()||raw.includes("\0")||new TextEncoder().encode(raw).length>256*1024||raw.length>30122){$("import-feedback").textContent="内容为空、格式异常或过长；请分首导入（正文最多 30000 字）。";return;}
 const lines=raw.split("\n"),first=lines[0],heading=first.match(/^#{1,6}\s+(.+)$/);
 const hasTitle=heading||(first.trim().length>0&&first.length<=120&&lines[1]===""&&!/[，。！？；]$/.test(first));
 const title=heading?heading[1]:hasTitle?first:"导入的作品";
 const body=hasTitle?lines.slice(heading?1:2).join("\n"):raw;
 if(!body.trim()||body.length>30000||title.length>120){$("import-feedback").textContent="请检查正文，正文最多 30000 字，标题最多 120 字。";return;}
 autosaveIfChanged();resetEditor();put("title",title);put("body",body);autosave();$("import-dialog").close();$("import-text").value="";feedback("已导入为本机草稿，请确认标题、作者和正文；尚未上传或发布。");
};
let importRead=0;
$("import-text").oninput=()=>{importRead++;};
$("import-dialog").addEventListener("close",()=>{importRead++;});
$("import-file").onchange=async()=>{
 const file=$("import-file").files?.[0],version=++importRead;if(!file)return;
 try{if(!/\.(txt|md)$/i.test(file.name))throw Error("请选择 TXT 或 Markdown 文件。");if(file.size>256*1024)throw Error("文件超过 256 KB，请分首导入。");
 const text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());if(text.includes("\0"))throw Error("文件不是可读取的纯文本。");
 if(version!==importRead)return;$("import-text").value=text;$("import-feedback").textContent="文件已读取，请检查后点击导入。";
 }catch(e){if(version===importRead)$("import-feedback").textContent=e.message+" 原作品未改动。请使用 UTF-8 文本，或直接粘贴。";}
};
