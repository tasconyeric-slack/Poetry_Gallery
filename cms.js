// Poetry Gallery: D1 phone-SMS client. No Supabase/browser-held secrets.
const $=id=>document.getElementById(id),form=$("poem-form");
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
const image=id=>id?"/api/poetry?op=cover&id="+encodeURIComponent(id):null;
function resetEditor(){
  activeId=null;form.reset();$("editor-heading").textContent="新建诗作";
  $("editor-state").textContent="先保存草稿，再上传配图。";
  $("delete-poem").hidden=true;$("admin-cover-preview").hidden=true;
  $("admin-cover-preview").removeAttribute("src");
}
function forGallery(p){return {id:p.id,title:p.title,author:"诗词馆",dynasty:"原创",
  genre:p.genre,lines:p.body.split("\n"),note:p.note||"",coverUrl:image(p.cover_id),demo:false};}
async function refreshGallery(){
  try{const result=await api("list");window.poetryGallery.setPublished((result.poems||[]).map(forGallery),false);
    window.poetryGallery.setStatus("");}
  catch{window.poetryGallery.setPublished([],false);
    window.poetryGallery.setStatus("诗集暂时无法读取，请刷新重试。");}
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
  if(p.cover_id)$("admin-cover-preview").src=image(p.cover_id);
  else $("admin-cover-preview").removeAttribute("src");
}
const auth=$("login-form");
$("send-code").addEventListener("click",async()=>{
  const phone=auth.elements.namedItem("phone");
  if(!phone.checkValidity())return feedback("请输入完整手机号，例如 +8613800000000。");
  const b=$("send-code");b.disabled=true;
  try{await api("send",{phone:phone.value.trim()});feedback("验证码已发送，5 分钟内有效。");}
  catch(e){feedback("发送失败："+e.message);}finally{b.disabled=false;}
});
auth.addEventListener("submit",async e=>{
  e.preventDefault();const b=auth.querySelector('button[type="submit"]');b.disabled=true;
  try{
    await api("verify",{phone:auth.elements.namedItem("phone").value.trim(),
      code:auth.elements.namedItem("code").value.trim()});
    auth.elements.namedItem("code").value="";
    await refreshOwner();feedback("已登录，60 天内无需再次获取短信。");
  }catch(e){feedback("验证失败："+e.message);}finally{b.disabled=false;}
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
  try{
    const resp=await fetch("/api/config",{cache:"no-store"});
    if(!resp.ok)throw Error("unavailable");
    const config=await resp.json();
    if(!config.configured){status("后台未连接，当前是古典诗词演示模式。");return;}
    await refreshGallery();await refreshOwner();
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refreshGallery();});
  }catch{
    status("数据服务暂不可用。");
    window.poetryGallery.setPublished([],false);
    window.poetryGallery.setStatus("数据服务暂不可用。");
  }
}
void initialize();
