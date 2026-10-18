// Poetry Gallery: read-only public D1 now; protected editor awaits Passkey enrollment.
const $=id=>document.getElementById(id),form=$("poem-form");
const PUBLIC_API="https://poetry-gallery-api.tasconyeric.workers.dev";
let ownPoems=[],activeId=null,isAdmin=false;
const feedback=msg=>{$("admin-feedback").textContent=msg;};
const status=msg=>{$("admin-status").textContent=msg;};
const get=name=>String(form.elements.namedItem(name).value||"");
const put=(name,v)=>{form.elements.namedItem(name).value=v??"";};
async function api(op,body,extras=""){
  const url="/api/poetry?op="+encodeURIComponent(op)+(extras?"&"+extras:"");
  const res=await fetch(url,{method:body===undefined?"GET":"POST",credentials:"same-origin",
    headers:body===undefined?{}:{"content-type":"application/json"},
    body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
  if(!res.ok){let error={};try{error=await res.json();}catch{}
    throw Error(error.error||"HTTP "+res.status);}
  return res.json();
}
async function publicApi(op,extra=""){
  const response=await fetch(PUBLIC_API+"/?op="+encodeURIComponent(op)+extra,{
    method:"GET",mode:"cors",credentials:"omit",cache:"no-store"
  });
  if(!response.ok)throw Error("Public archive unavailable ("+response.status+")");
  return response.json();
}
const image=id=>id?PUBLIC_API+"/?op=cover&id="+encodeURIComponent(id):null;
const ownerImage=id=>id?"/api/poetry?op=cover&id="+encodeURIComponent(id):null;
function resetEditor(){
  activeId=null;form.reset();$("editor-heading").textContent="新建诗作";
  $("editor-state").textContent="先保存草稿，再上传配图。";
  $("delete-poem").hidden=true;$("admin-cover-preview").hidden=true;
  $("admin-cover-preview").removeAttribute("src");
}
function forGallery(p){return {id:p.id,title:p.title,author:"诗词馆",dynasty:"原创",
  genre:p.genre,lines:p.body.split("\n"),note:p.note||"",coverUrl:image(p.cover_id),demo:false};}
async function refreshGallery(){
  try{
    const result=await publicApi("list");
    const published=(result.poems||[]).map(forGallery);
    if(published.length){
      window.poetryGallery.setPublished(published,false);
      window.poetryGallery.setStatus("");
    }else{
      window.poetryGallery.showExamples();
      window.poetryGallery.setStatus("目前尚无已发布的原创诗作。以下展示古典诗词版式示例。");
    }
  }catch{
    window.poetryGallery.showExamples();
    window.poetryGallery.setStatus("原创诗集暂时无法连接，当前仅显示古典诗词演示。");
  }
}
async function refreshOwner(){
  const result=await api("session");isAdmin=Boolean(result.owner);
  $("login-form").hidden=isAdmin;$("admin-workspace").hidden=!isAdmin;
  status(isAdmin?"管理员已登录":"请输入授权手机号并获取验证码。");
  if(isAdmin)await loadPoems();
}
async function loadPoems(){
  const result=await api("owner-list");ownPoems=result.poems||[];
  const list=$("admin-list");list.replaceChildren();
  if(!ownPoems.length){const p=document.createElement("p");p.textContent="暂时没有作品。";list.append(p);}
  for(const poem of ownPoems){
    const b=document.createElement("button");b.className="admin-item"+(poem.id===activeId?" selected":"");
    b.type="button";const t=document.createElement("strong");t.textContent=poem.title;
    const st=document.createElement("small");st.textContent=poem.status==="published"?"已发布":"草稿";
    b.append(t,st);b.addEventListener("click",()=>openPoem(poem.id));list.append(b);
  }
}
function openPoem(id){
  const p=ownPoems.find(x=>x.id===id);if(!p)return;
  activeId=id;$("editor-heading").textContent="编辑作品";
  for(const n of ["title","body","genre","composed_on","note"])put(n,p[n]);
  $("editor-state").textContent=p.status==="published"?"当前状态：已发布":"当前状态：草稿";
  $("delete-poem").hidden=false;$("admin-cover-preview").hidden=!p.cover_id;
  if(p.cover_id)$("admin-cover-preview").src=ownerImage(p.cover_id);
  else $("admin-cover-preview").removeAttribute("src");
}
$("export-backup").addEventListener("click",async()=>{
  if(!isAdmin)return feedback("请先完成管理员验证。");
  const button=$("export-backup");button.disabled=true;
  try{
    const snapshot=await api("backup");
    if(snapshot.format!=="poetry-gallery-backup-v1"||
      !Array.isArray(snapshot.poems)||!Array.isArray(snapshot.covers))
      throw Error("备份文件格式不正确");
    const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
    const href=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=href;a.download="poetry-gallery-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1000);
    feedback("备份已导出，请保存在安全位置。文件可能包含未发布诗作及私有照片。");
  }catch(error){feedback("备份失败："+error.message);}
  finally{button.disabled=false;}
});
$("sign-out").addEventListener("click",async()=>{
  try{await api("logout",{});isAdmin=false;resetEditor();await refreshOwner();feedback("已退出登录。");}
  catch(e){feedback(e.message);}
});
$("new-poem").addEventListener("click",()=>{resetEditor();void loadPoems();form.elements.namedItem("title").focus();});
const busy=value=>{form.querySelectorAll("button").forEach(b=>{b.disabled=value;});};
form.addEventListener("submit",async e=>{
  e.preventDefault();if(!isAdmin)return;
  const flag=e.submitter?.dataset.saveStatus||"draft";
  busy(true);
  try{
    const result=await api("save",{id:activeId,title:get("title"),body:get("body"),
      genre:get("genre"),note:get("note"),composed_on:get("composed_on")||null,status:flag});
    activeId=result.id;await loadPoems();openPoem(activeId);await refreshGallery();
    feedback(flag==="published"?"作品已公开发布。":"草稿已保存。");
  }catch(e){feedback("保存失败："+e.message);}finally{busy(false);}
});
$("delete-poem").addEventListener("click",async()=>{
  if(!activeId||!window.confirm("确定永久删除这首作品？"))return;
  busy(true);
  try{await api("delete",{id:activeId});resetEditor();await loadPoems();await refreshGallery();
    feedback("作品已删除。");}
  catch(e){feedback("删除失败："+e.message);}finally{busy(false);}
});
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
$("upload-cover").addEventListener("click",async()=>{
  if(!activeId)return feedback("请先保存草稿。");
  const file=$("cover-upload").files?.[0];if(!file)return feedback("请选择图片。");
  const button=$("upload-cover");button.disabled=true;
  try{
    const base64=await compress(file);
    await api("upload",{poem_id:activeId,mime:"image/jpeg",base64});
    await loadPoems();openPoem(activeId);await refreshGallery();
    $("cover-upload").value="";feedback("配图已上传。");
  }catch(e){feedback("配图失败："+e.message);}finally{button.disabled=false;}
});
async function initialize(){
  resetEditor();
  $("login-form").hidden=false;
  $("admin-workspace").hidden=true;
  status("管理登录即将改用手机通行密钥（Passkey）。目前管理功能尚未开放，绝不允许匿名编辑。");
  await refreshGallery();
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)void refreshGallery();
  });
}
void initialize();
