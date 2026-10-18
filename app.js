/* The first release deliberately uses public-domain examples only.
 * Real family poems and persistent editing belong to the authenticated MVP.
 */
const poems = [
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
  foot.append(node("span", "", "古典诗词 · 演示"), node("span", "card-arrow", "↗"));
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
  document.getElementById("reader-note").textContent = poem.note;
  feedback.textContent = "";
  document.title = `${poem.title} · 诗词馆`;
}

function renderRoute() {
  const route = decodeURIComponent(location.hash.slice(1));
  const isPoemRoute = route.startsWith("poem/");
  const poem = isPoemRoute ? poems.find(p => p.id === route.slice(5)) : null;
  if (poem) {
    activePoem = poem;
    renderReading(poem);
    catalog.hidden = true;
    reading.hidden = false;
    window.scrollTo(0, 0);
  } else {
    activePoem = null;
    catalog.hidden = false;
    reading.hidden = true;
    document.title = "诗词馆 · 把岁月写成诗";
    if (isPoemRoute) {
      feedback.textContent = "未找到这首诗。";
      location.replace("#gallery");
    }
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
      window.prompt("请复制下方链接分享：", url);
      feedback.textContent = "可复制链接发送给家人。";
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
    window.prompt("请复制下方链接分享：", url);
    feedback.textContent = "可复制链接发送给家人。";
  }
});
document.getElementById("print-poem").addEventListener("click", () => window.print());
document.getElementById("year").textContent = String(new Date().getFullYear());
window.addEventListener("hashchange", renderRoute);
renderGrid();
renderRoute();
