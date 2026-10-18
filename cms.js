// Single-owner publishing client. Database/storage authorization is enforced by RLS.
const $ = id => document.getElementById(id);
const loginForm = $("login-form");
const workspace = $("admin-workspace");
const editor = $("poem-form");
let db = null;
let owner = null;
let ownPoems = [];
let editingId = null;
let verifying = false;

function adminMessage(message) { $("admin-status").textContent = message; }
function feedback(message) { $("admin-feedback").textContent = message; }
function errMessage(error) { return error?.message || "请稍后重试。"; }
function getValue(name) { return String(editor.elements.namedItem(name).value || ""); }
function setValue(name, value) { editor.elements.namedItem(name).value = value ?? ""; }
function emptyEditor() {
  editingId = null;
  editor.reset();
  $("editor-heading").textContent = "新建诗作";
  $("editor-state").textContent = "先保存草稿，再上传配图。";
  $("delete-poem").hidden = true;
  $("admin-cover-preview").hidden = true;
  $("admin-cover-preview").removeAttribute("src");
}
function asGalleryPoem(p, coverUrl) {
  return {
    id: p.id, title: p.title, author: "诗词馆", dynasty: "原创",
    genre: p.genre, lines: p.body.split("\n"), note: p.note || "",
    coverUrl: coverUrl || null, demo: false
  };
}
async function getCover(path) {
  if (!path) return null;
  const {data, error} = await db.storage.from("poem-covers").createSignedUrl(path, 900);
  return error ? null : data?.signedUrl || null;
}
async function refreshGallery() {
  if (!db) return;
  try {
    const {data, error} = await db.from("poems")
      .select("id,title,body,genre,note,cover_path,published_at")
      .eq("status","published").order("published_at",{ascending:false});
    if (error) throw error;
    const poems = await Promise.all((data || []).map(async p =>
      asGalleryPoem(p, await getCover(p.cover_path))));
    window.poetryGallery.setPublished(poems, false);
    window.poetryGallery.setStatus("");
  } catch (error) {
    window.poetryGallery.setPublished([], false);
    window.poetryGallery.setStatus("诗集暂时无法加载，请检查网络并刷新重试。");
    console.error("Gallery query failed:", error?.code || "unknown");
  }
}
async function refreshOwner() {
  if (!db || verifying) return;
  verifying = true;
  try {
    const {data:authData} = await db.auth.getUser();
    const user = authData?.user;
    owner = null;
    workspace.hidden = true;
    if (!user) {
      loginForm.hidden = false;
      adminMessage("请使用已授权的管理员邮箱登录。");
      return;
    }
    const {data:member,error} = await db.from("poetry_owners")
      .select("user_id").eq("user_id",user.id).maybeSingle();
    if (error) throw error;
    if (!member) {
      loginForm.hidden = false;
      adminMessage("此账号不是授权管理员。请退出并使用管理员邮箱。");
      return;
    }
    owner = user;
    loginForm.hidden = true;
    workspace.hidden = false;
    adminMessage("已登录管理空间。");
    await loadOwnPoems();
  } catch (error) {
    loginForm.hidden = false;
    adminMessage("管理员验证失败：" + errMessage(error));
  } finally {
    verifying = false;
  }
}
async function loadOwnPoems() {
  if (!owner) return;
  const {data,error} = await db.from("poems")
    .select("id,title,body,genre,note,status,composed_on,published_at,cover_path,created_at,updated_at")
    .order("updated_at",{ascending:false});
  if (error) throw error;
  ownPoems = data || [];
  renderOwnList();
}
function renderOwnList() {
  const list = $("admin-list");
  list.replaceChildren();
  if (!ownPoems.length) {
    const p = document.createElement("p");
    p.textContent = "还没有作品。可以开始新建。";
    list.append(p);
  }
  for (const poem of ownPoems) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-item" + (editingId === poem.id ? " selected" : "");
    const title = document.createElement("strong");
    title.textContent = poem.title;
    const status = document.createElement("small");
    status.textContent = poem.status === "published" ? "已发布" : "草稿";
    button.append(title,status);
    button.addEventListener("click",() => { void openEditor(poem.id); });
    list.append(button);
  }
}
async function openEditor(id) {
  const p = ownPoems.find(item => item.id === id);
  if (!p) return;
  editingId = id;
  $("editor-heading").textContent = "编辑作品";
  setValue("title",p.title);
  setValue("body",p.body);
  setValue("genre",p.genre);
  setValue("composed_on",p.composed_on);
  setValue("note",p.note);
  $("editor-state").textContent = p.status === "published" ? "当前状态：已发布" : "当前状态：草稿";
  $("delete-poem").hidden = false;
  $("admin-cover-preview").hidden = true;
  if (p.cover_path) {
    const url = await getCover(p.cover_path);
    if (editingId === id && url) {
      $("admin-cover-preview").src = url;
      $("admin-cover-preview").hidden = false;
    }
  }
  renderOwnList();
}
function busy(state) {
  for (const button of editor.querySelectorAll("button")) button.disabled = state;
}
async function savePoem(status) {
  if (!owner) throw Error("请先登录管理员账号。");
  const previous = ownPoems.find(p => p.id === editingId);
  const title = getValue("title").trim();
  const body = getValue("body").trim();
  if (!title || !body) throw Error("标题和正文不能为空。");
  if (body.length > 30000) throw Error("正文不能超过 30000 字。");
  const record = {
    title, body, genre: getValue("genre"),
    note: getValue("note").trim() || null,
    composed_on: getValue("composed_on") || null,
    status, published_at: status === "published"
      ? previous?.published_at || new Date().toISOString() : null
  };
  const query = editingId
    ? db.from("poems").update(record).eq("id",editingId)
    : db.from("poems").insert({...record,owner_id:owner.id});
  const {data,error} = await query.select("id").single();
  if (error) throw error;
  editingId = data.id;
  await loadOwnPoems();
  await openEditor(editingId);
  await refreshGallery();
  feedback(status === "published" ? "作品已公开发布。" : "草稿已保存，公开页面不可见。");
}
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!db) return;
  const email = String(loginForm.elements.namedItem("email").value).trim();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  try {
    const redirect = new URL(location.pathname,location.origin);
    redirect.searchParams.set("entry","admin");
    const {error} = await db.auth.signInWithOtp({
      email, options:{shouldCreateUser:false,emailRedirectTo:redirect.toString()}
    });
    if (error) throw error;
    feedback("如邮箱已授权，请查收登录邮件并点击链接。");
  } catch (error) {
    feedback("邮件发送失败：" + errMessage(error));
  } finally { button.disabled = false; }
});
$("sign-out").addEventListener("click", async () => {
  if (!db) return;
  const {error} = await db.auth.signOut();
  if (error) return feedback(errMessage(error));
  owner = null;
  ownPoems = [];
  emptyEditor();
  await refreshOwner();
  feedback("已退出登录。");
});
$("new-poem").addEventListener("click", () => {
  emptyEditor();
  renderOwnList();
  feedback("");
  editor.elements.namedItem("title").focus();
});
editor.addEventListener("submit", async event => {
  event.preventDefault();
  const status = event.submitter?.dataset.saveStatus || "draft";
  busy(true);
  try { await savePoem(status); }
  catch (error) { feedback("保存失败：" + errMessage(error)); }
  finally { busy(false); }
});
$("delete-poem").addEventListener("click", async () => {
  if (!editingId || !owner || !window.confirm("确定永久删除这首作品吗？删除后无法恢复。")) return;
  busy(true);
  try {
    const {error} = await db.from("poems").delete().eq("id",editingId);
    if (error) throw error;
    emptyEditor();
    await loadOwnPoems();
    await refreshGallery();
    feedback("作品已删除。");
  } catch (error) { feedback("删除失败：" + errMessage(error)); }
  finally { busy(false); }
});
$("upload-cover").addEventListener("click", async () => {
  const file = $("cover-upload").files?.[0];
  if (!owner || !editingId) return feedback("请先保存草稿，再上传配图。");
  if (!file) return feedback("请先选择图片。");
  const extensions = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
  if (!extensions[file.type] || file.size > 5*1024*1024 || file.size === 0)
    return feedback("只能上传 5MB 内的 JPG、PNG、WebP 图片。");
  const button = $("upload-cover");
  button.disabled = true;
  try {
    const path = owner.id + "/" + editingId + "/" + crypto.randomUUID() + "." + extensions[file.type];
    const {error} = await db.storage.from("poem-covers")
      .upload(path,file,{contentType:file.type,upsert:false});
    if (error) throw error;
    const {error:writeError} = await db.from("poems")
      .update({cover_path:path}).eq("id",editingId);
    if (writeError) {
      await db.storage.from("poem-covers").remove([path]);
      throw writeError;
    }
    await loadOwnPoems();
    await openEditor(editingId);
    await refreshGallery();
    $("cover-upload").value = "";
    feedback("图片已上传并保存。");
  } catch (error) { feedback("上传失败：" + errMessage(error)); }
  finally { button.disabled = false; }
});
async function initialize() {
  emptyEditor();
  try {
    // Static local HTTP servers have no /api/config: keep their demo readable.
    const response = await fetch("/api/config",{cache:"no-store"});
    if (!response.ok) throw Error("no-config");
    const config = await response.json();
    if (!config.configured) throw Error("no-config");
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url) || !config.key)
      throw Error("invalid-config");
    const {createClient} = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm");
    db = createClient(config.url,config.key,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    db.auth.onAuthStateChange(() => {
      setTimeout(() => { void refreshOwner(); },0);
    });
    if (new URLSearchParams(location.search).get("entry") === "admin") {
      history.replaceState(null,"",location.pathname + "#admin");
      window.dispatchEvent(new Event("hashchange"));
    }
    await refreshGallery();
    await refreshOwner();
    document.addEventListener("visibilitychange",() => {
      if (!document.hidden) void refreshGallery();
    });
  } catch (error) {
    if (error.message === "no-config") {
      adminMessage("尚未接入 Supabase。当前仅为演示模式，不能保存原创作品。");
      window.poetryGallery.setStatus("");
    } else {
      adminMessage("数据库连接失败，请检查配置及网络。");
      window.poetryGallery.setPublished([],false);
      window.poetryGallery.setStatus("数据服务暂时不可用，请稍后再试。");
    }
  }
}
void initialize();
