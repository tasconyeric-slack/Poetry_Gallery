/* The first release deliberately uses public-domain examples only.
 * Real family poems and persistent editing belong to the authenticated MVP.
 */
let poems = [
  {
    id: "jing-ye-si",
    title: "静夜思",
    author: "李白",
    dynasty: "唐",
    genre: "五言",
    lines: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
    note: "一首关于月光与思乡的短诗。"
  },
  {
    id: "shan-ju-qiu-ming",
    title: "山居秋暝",
    author: "王维",
    dynasty: "唐",
    genre: "五言",
    lines: ["空山新雨后，", "天气晚来秋。", "明月松间照，", "清泉石上流。", "竹喧归浣女，", "莲动下渔舟。", "随意春芳歇，", "王孙自可留。"],
    note: "清幽山居，雨后秋色。"
  },
  {
    id: "jiang-pan-du-bu-xun-hua",
    title: "江畔独步寻花",
    author: "杜甫",
    dynasty: "唐",
    genre: "七言",
    lines: ["黄四娘家花满蹊，", "千朵万朵压枝低。", "留连戏蝶时时舞，", "自在娇莺恰恰啼。"],
    note: "春日赏花，满眼生机。"
  }
];

const demoPoems = poems.slice();
const catalog = document.getElementById("catalog-view");
const reading = document.getElementById("reading-view");
const grid = document.getElementById("poem-grid");
const search = document.getElementById("poem-search");
const empty = document.getElementById("no-results");
const feedback = document.getElementById("reader-feedback");
let activeFilter = "全部";
let activePoem = null;

function node(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent !== undefined) el.textContent = textContent;
  return el;
}

function cardFor(poem, index) {
  const card = node("button", "poem-card");
  card.type = "button";
  card.setAttribute("aria-label", `阅读《${poem.title}》，作者${poem.author}`);
  const top = node("div", "card-top");
  top.append(node("span", "card-tag", poem.genre), node("span", "", String(index + 1).padStart(2, "0") + " / ARCHIVE"));
  card.append(top);
  card.append(node("h3", "card-title", poem.title));
  card.append(node("span", "card-author", `${poem.dynasty} · ${poem.author}`));
  card.append(node("div", "card-excerpt", poem.lines.slice(0, 2).join("\n")));
  const foot = node("div", "card-footer");
  foot.append(node("span", "", poem.demo === false ? "原创诗作" : "古典诗词 · 演示"), node("span", "card-arrow", "↗"));
  card.append(foot);
  card.addEventListener("click", () => { location.hash = "poem/" + poem.id; });
  return card;
}

function renderGrid() {
  const keyword = search.value.trim().toLocaleLowerCase("zh-CN");
  const filtered = poems.filter(p => (activeFilter === "全部" || p.genre === activeFilter) &&
    [p.title, p.author, p.dynasty, p.lines.join("")].join(" ").toLocaleLowerCase("zh-CN").includes(keyword));
  grid.replaceChildren(...filtered.map((poem, index) => cardFor(poem, index)));
  empty.hidden = filtered.length > 0;
}

function renderReading(poem) {
  document.getElementById("reader-title").textContent = poem.title;
  document.getElementById("reader-author").textContent = `${poem.dynasty} · ${poem.author}`;
  document.getElementById("reader-genre").textContent = `古典诗词 / ${poem.genre}`;
  document.getElementById("reader-poem").textContent = poem.lines.join("\n");
  document.getElementById("reader-note").textContent = poem.note || "";
  const cover = document.getElementById("reader-cover");
  cover.hidden = !poem.coverUrl;
  if (poem.coverUrl) cover.src = poem.coverUrl;
  else cover.removeAttribute("src");
  document.getElementById("reader-demo-label").hidden = poem.demo === false;
  feedback.textContent = "";
  document.getElementById("share-manual").hidden = true;
  document.getElementById("share-image-preview").hidden = true;
  document.title = `${poem.title} · 诗词馆`;
}

function renderRoute() {
  const route = decodeURIComponent(location.hash.slice(1));
  const admin = document.getElementById("admin-view");
  const isAdmin = route === "admin";
  const isPoem = route.startsWith("poem/");
  const poem = isPoem ? poems.find(p => p.id === route.slice(5)) : null;
  admin.hidden = !isAdmin;
  catalog.hidden = isAdmin || isPoem;
  reading.hidden = !isPoem;
  document.querySelector(".reader-actions").hidden = isPoem && !poem;
  if (poem) {
    activePoem = poem;
    renderReading(poem);
    window.scrollTo(0, 0);
  } else if (isPoem) {
    activePoem = null;
    document.getElementById("reader-title").textContent = "作品不存在或尚未发布";
    document.getElementById("reader-author").textContent = "";
    document.getElementById("reader-genre").textContent = "";
    document.getElementById("reader-poem").textContent = "";
    document.getElementById("reader-note").textContent = "请返回诗集查看已公开的作品。";
    document.getElementById("reader-cover").hidden = true;
    document.getElementById("reader-demo-label").hidden = true;
    document.title = "未找到作品 · 诗词馆";
  } else {
    activePoem = null;
    document.title = isAdmin ? "诗作管理 · 诗词馆" : "诗词馆 · 把岁月写成诗";
  }
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(b => {
      const selected = b === button;
      b.classList.toggle("active", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
    renderGrid();
  });
});
search.addEventListener("input", renderGrid);
document.getElementById("back-to-gallery").addEventListener("click", () => { location.hash = "gallery"; });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && activePoem) location.hash = "gallery";
});

// Generate a self-contained, text-only image. Do not draw cross-origin covers
// to the canvas, so the image remains exportable and unpublished text is never uploaded.
let previousShareImageUrl = null;
document.getElementById("export-poem-image").addEventListener("click", async () => {
  if (!activePoem) return;
  const contentLines = activePoem.lines.flatMap(raw => {
    const chars = Array.from(raw);
    if (!chars.length) return [""];
    const chunks = [];
    for (let i = 0; i < chars.length; i += 17) {
      chunks.push(chars.slice(i, i + 17).join(""));
    }
    return chunks;
  });
  if (contentLines.length > 34) {
    feedback.textContent = "这首诗篇幅较长，请使用链接分享或打印成 PDF。";
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = Math.max(1250, 480 + contentLines.length * 66 + 220);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    feedback.textContent = "当前浏览器不支持图片导出。";
    return;
  }
  const paper = "#f7f5ef", ink = "#374239", accent = "#93654e";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#d9d3c9";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 820, canvas.height - 80);
  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "24px serif";
  ctx.fillText("诗 词 馆  ·  岁 月 成 章", 450, 112);
  ctx.fillStyle = ink;
  ctx.font = '600 58px "Songti SC","Noto Serif CJK SC",serif';
  ctx.fillText(activePoem.title.slice(0, 25), 450, 225, 760);
  ctx.font = "26px serif";
  ctx.fillStyle = "#808579";
  ctx.fillText((activePoem.dynasty + " · " + activePoem.author).slice(0, 40), 450, 284, 760);
  ctx.strokeStyle = "#bfae98";
  ctx.beginPath();
  ctx.moveTo(330, 327);
  ctx.lineTo(570, 327);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '36px "Songti SC","Noto Serif CJK SC",serif';
  contentLines.forEach((line, index) => {
    ctx.fillText(line, 450, 406 + index * 66, 750);
  });
  ctx.fillStyle = accent;
  ctx.font = "23px serif";
  ctx.fillText("一字一句，皆有来处。", 450, canvas.height - 146);
  ctx.fillStyle = "#999b94";
  ctx.font = "20px sans-serif";
  ctx.fillText("shici.byliyz.com", 450, canvas.height - 100);
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw Error("生成失败");
    if (previousShareImageUrl) URL.revokeObjectURL(previousShareImageUrl);
    const imageUrl = URL.createObjectURL(blob);
    previousShareImageUrl = imageUrl;
    document.getElementById("share-image-output").src = imageUrl;
    document.getElementById("share-image-preview").hidden = false;
    feedback.textContent = "诗卡已生成。可长按下方图片保存后发送到微信。";
    document.getElementById("share-image-preview").scrollIntoView({behavior:"smooth",block:"nearest"});
  } catch {
    feedback.textContent = "图片生成失败，请改用链接分享。";
  }
});

function showManualShare(url) {
  const area = document.getElementById("share-manual");
  const input = document.getElementById("share-manual-url");
  input.value = url;
  area.hidden = false;
  input.focus();
  input.select();
}
document.getElementById("share-manual-select").addEventListener("click", () => {
  const input = document.getElementById("share-manual-url");
  input.focus();
  input.select();
});
document.getElementById("share-poem").addEventListener("click", async () => {
  if (!activePoem) return;
  const url = location.href;
  const title = `《${activePoem.title}》 · 诗词馆`;
  try {
    if (navigator.share) {
      await navigator.share({title, text: `${activePoem.author} · ${activePoem.lines.slice(0, 2).join("")}`, url});
      feedback.textContent = "分享已打开。";
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      feedback.textContent = "作品链接已复制，可粘贴到微信发送。";
    } else {
      showManualShare(url);
      feedback.textContent = "可复制链接发送给家人。";
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
    showManualShare(url);
    feedback.textContent = "可复制链接发送给家人。";
  }
});
document.getElementById("print-poem").addEventListener("click", () => window.print());
document.getElementById("year").textContent = String(new Date().getFullYear());
window.addEventListener("hashchange", renderRoute);
// Simple print anthology of published works; all user text is inserted as textContent.
const printBook = document.getElementById("anthology-print");
document.getElementById("print-anthology").addEventListener("click", () => {
  if (!poems.length) return window.alert("暂无可打印的已发布作品。");
  printBook.replaceChildren();
  printBook.hidden = false;
  const heading = document.createElement("h1");
  heading.textContent = poems.some(p => p.demo !== false)
    ? "古典诗词示例 · 演示诗集" : "诗词馆 · 已发布诗作选集";
  printBook.append(heading);
  for (const poem of poems) {
    const article = document.createElement("article");
    const title = document.createElement("h2");
    title.textContent = poem.title;
    const author = document.createElement("p");
    author.textContent = poem.dynasty + " · " + poem.author +
      (poem.demo === false ? "" : " · 演示内容");
    const content = document.createElement("div");
    content.className = "anthology-body";
    content.textContent = poem.lines.join("\n");
    const note = document.createElement("p");
    note.textContent = poem.note || "";
    article.append(title, author, content, note);
    printBook.append(article);
  }
  document.body.classList.add("print-anthology");
  window.print();
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-anthology");
  printBook.hidden = true;
});

window.poetryGallery = {
  showExamples() {
    poems=demoPoems;
    document.getElementById("demo-notice").hidden=false;
    renderGrid();
    renderRoute();
  },
  setPublished(items, isDemo) {
    poems = items;
    document.getElementById("demo-notice").hidden = !isDemo;
    document.getElementById("no-results").textContent = items.length
      ? "没有找到符合条件的诗作，试试其他关键词。" : "暂无已发布的诗作。";
    renderGrid();
    renderRoute();
  },
  setStatus(message) {
    const status = document.getElementById("collection-status");
    status.hidden = !message;
    status.textContent = message || "";
  }
};
renderGrid();
renderRoute();
