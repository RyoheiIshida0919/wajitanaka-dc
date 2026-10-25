#!/usr/bin/env node
// EmDash に「ページ」コレクションと各部品（ブロック）の定義を作り、今のサイトの文章・写真をそのまま流し込む。
// 一度だけ実行する想定（既にあるものは作らずに飛ばす）。写真は public/images から EmDash のメディアへ上げる。
//   node scripts/setup-blocks.mjs
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const mcp = (tool, args) => {
  try {
    return JSON.parse(execFileSync("node", ["scripts/emdash-mcp.mjs", tool, "-"], { input: JSON.stringify(args), encoding: "utf8", maxBuffer: 64 << 20 }));
  } catch (e) {
    throw new Error(`${tool}: ${String(e.stderr || e.message).slice(0, 600)}`);
  }
};

// ── 部品（ブロック）の定義 ─────────────────────────────
const S = (slug, label, type = "string", extra = {}) => ({ slug, label, type, ...extra });
const R = (slug, label, subFields) => ({ slug, label, type: "repeater", validation: { subFields } });
const BLOCKS = [
  { slug: "hero_slider", label: "トップのスライド", fields: [S("catch_text", "1枚目のキャッチコピー（改行できます）", "text"), R("slides", "写真のスライド（2枚目以降）", [S("image", "写真", "image"), S("alt", "写真の説明（読み上げ用）")])] },
  { slug: "message", label: "メッセージ（写真＋文章）", fields: [S("image", "写真", "image"), S("heading", "見出し"), S("lead", "リード文（改行できます）", "text"), S("body", "本文（改行できます）", "text")] },
  { slug: "features", label: "当院の特徴", fields: [S("heading", "見出し"), R("items", "特徴", [S("title", "タイトル"), S("body", "本文", "text"), S("image1", "写真1", "image"), S("image2", "写真2", "image")])] },
  { slug: "treatments", label: "診療案内", fields: [S("heading", "見出し"), R("items", "診療メニュー", [S("name", "名前"), S("sub", "説明"), S("icon", "アイコン", "image")])] },
  { slug: "access", label: "アクセス", fields: [S("heading", "見出し"), S("map_url", "Googleマップの埋め込みURL", "url"), R("routes", "交通手段", [S("label", "手段（例 お車）"), S("text", "案内")])] },
  { slug: "news", label: "お知らせ欄", fields: [S("heading", "見出し"), S("lead", "案内文"), S("button_label", "ボタンの文字"), S("button_url", "ボタンのリンク先", "url")] },
  { slug: "page_hero", label: "ページの見出し画像", fields: [S("title", "ページの見出し"), S("image", "写真", "image"), S("position", "写真の表示位置（例 center 50%）")] },
  { slug: "doctors", label: "医師紹介", fields: [R("items", "医師", [S("role", "役職"), S("name", "名前"), S("image", "写真", "image"), S("message", "メッセージ", "text"), S("career", "経歴（1行に1つ）", "text"), S("specialty", "得意な治療", "text")])] },
  { slug: "commitments", label: "こだわり", fields: [R("items", "こだわり", [S("title", "タイトル"), S("text", "本文", "text"), S("image1", "写真1", "image"), S("image2", "写真2", "image")])] },
  { slug: "faq", label: "よくある質問", fields: [S("heading", "見出し"), S("sub", "小見出し"), R("items", "質問", [S("question", "質問"), S("answer", "答え", "text")])] },
  { slug: "blog", label: "ブログ（note）", fields: [S("lead", "案内文", "text"), S("note_profile_url", "noteのページURL", "url"), S("note_embed_url", "noteの埋め込みURL", "url"), S("placeholder_title", "記事がないときの見出し"), S("placeholder_text", "記事がないときの文章", "text"), S("button_label", "ボタンの文字"), S("button_url", "ボタンのリンク先", "url")] },
  { slug: "simple_page", label: "文章だけのページ", fields: [S("title", "見出し"), S("body", "本文（空行で段落）", "text")] },
];

// ── 今のサイトの内容（部品ファイルの既定値をそのまま読む） ──────────
function arrayLiteral(file, name) {
  const s = readFileSync(file, "utf8");
  const i = s.indexOf(`const ${name} = [`);
  if (i < 0) throw new Error(`${name} not found in ${file}`);
  let depth = 0, j = s.indexOf("[", i);
  for (let k = j; k < s.length; k++) {
    if (s[k] === "[") depth++;
    if (s[k] === "]" && --depth === 0) return new Function(`return ${s.slice(j, k + 1)}`)();
  }
}

const media = new Map();
function upload(path) {
  if (!path) return undefined;
  if (media.has(path)) return media.get(path);
  const file = `public${path}`;
  if (!existsSync(file)) return undefined;
  const ext = path.split(".").pop().toLowerCase();
  const r = mcp("media_upload", { filename: path.split("/").pop(), base64: readFileSync(file).toString("base64"), contentType: ext === "png" ? "image/png" : "image/jpeg" });
  const item = r.item ?? r.media ?? r;
  const value = { id: item.id, src: item.url, alt: "", width: item.width, height: item.height, provider: "local", meta: { storageKey: item.storageKey } };
  media.set(path, value);
  return value;
}
const img = (path, alt = "") => {
  const m = upload(path);
  return m ? { ...m, alt } : undefined;
};

let k = 0;
const block = (type, data) => ({ _type: type, _version: 1, _key: `${type}-${++k}`, ...data });

function homeLayout() {
  const slides = arrayLiteral("src/components/sections/Hero.astro", "defaultSlides").filter((s) => s.type === "photo");
  const features = arrayLiteral("src/components/sections/Features.astro", "defaults");
  const treatments = arrayLiteral("src/components/sections/Treatments.astro", "defaults");
  const routes = arrayLiteral("src/components/sections/Access.astro", "defaultRoutes");
  return [
    block("hero_slider", { catch_text: "ここから笑顔がうまれる。\n歯も、心も。", slides: slides.map((s) => ({ image: img(s.src, s.alt), alt: s.alt })) }),
    block("message", {
      image: img("/images/site/staff-hero.jpg", "和地たなか歯科の医師とスタッフ"),
      heading: "生きる力はお口から",
      lead: "食べること、話すこと、笑うこと\nお口の健康は、毎日の生活を支える大切な基礎です。",
      body: "私たちは、ただ歯を直すだけでなく\n「一生自分の歯で健康に過ごすこと」を\nサポートする歯科医院を目指しています。",
    }),
    block("features", { heading: "当院の特徴", items: features.map((f) => ({ title: f.title, body: f.paragraphs.join("\n\n"), image1: img(f.images[0], f.title), image2: img(f.images[1]) })) }),
    block("treatments", { heading: "診療案内", items: treatments.map((t) => ({ name: t.name, sub: t.sub, icon: img(t.icon) })) }),
    block("access", { heading: "アクセス", routes }),
    block("news", { heading: "お知らせ", lead: "最新情報はInstagramをご覧ください", button_label: "Instagram", button_url: "https://www.instagram.com/wajitanakadc/" }),
  ];
}

const PAGES = [
  { slug: "home", title: "トップページ", layout: homeLayout },
  {
    slug: "doctors",
    title: "医師紹介",
    layout: () => [
      block("page_hero", { title: "医師紹介", image: img("/images/site/doctors-hero.jpg", "和地たなか歯科の院内"), position: "center 52%" }),
      block("doctors", {
        items: arrayLiteral("src/components/blocks/Doctors.astro", "defaults").map((d) => ({
          role: d.role, name: d.name, image: img(d.image, `${d.role} ${d.name}`), message: d.message, career: d.career.join("\n"), specialty: d.specialty,
        })),
      }),
    ],
  },
  {
    slug: "reviews",
    title: "こだわりとQ&A",
    layout: () => [
      block("page_hero", { title: "こだわりとQ&A", image: img("/images/site/reviews-hero.jpg", "院内の照明と木の天井"), position: "center 45%" }),
      block("commitments", { items: arrayLiteral("src/components/blocks/Commitments.astro", "defaults").map((c) => ({ title: c.title, text: c.text, image1: img(c.images[0], c.title), image2: img(c.images[1]) })) }),
      block("faq", { heading: "よくある質問", sub: "-FAQ-", items: arrayLiteral("src/components/blocks/Faq.astro", "defaults").map((f) => ({ question: f.question, answer: f.answer })) }),
    ],
  },
  {
    slug: "blog",
    title: "ブログ",
    layout: () => [
      block("page_hero", { title: "ブログ", image: img("/images/site/blog-hero.jpg", "院内に飾られた和地たなか歯科のイラスト"), position: "center 48%" }),
      block("blog", {
        lead: "診療案内・症例紹介・お口の健康情報などを発信しています。",
        placeholder_title: "記事の公開を準備しています",
        placeholder_text: "診療やお口の健康に関する情報を、順次お届けする予定です。\n最新のお知らせはInstagramをご覧ください。",
        button_label: "Instagramを見る",
        button_url: "https://www.instagram.com/wajitanakadc/",
      }),
    ],
  },
  { slug: "recruit", title: "求人", layout: () => [block("simple_page", { title: "求人", body: "コンテンツ準備中です。" })] },
  { slug: "privacy-policy", title: "プライバシーポリシー", layout: () => [block("simple_page", { title: "プライバシーポリシー", body: "個人情報の取り扱いについては、法令に従い適切に管理します。" })] },
];

// ── 実行 ───────────────────────────────────────
const have = new Set((mcp("schema_list_block_types", {}).items ?? []).map((b) => b.slug));
for (const b of BLOCKS) {
  if (have.has(b.slug)) { console.log("block exists", b.slug); continue; }
  mcp("schema_create_block_type", { ...b, category: "和地たなか歯科" });
  console.log("block created", b.slug);
}

const cols = mcp("schema_list_collections", {});
const colList = cols.collections ?? cols.items ?? cols;
if (!colList.some((c) => c.slug === "pages")) {
  mcp("schema_create_collection", { slug: "pages", label: "ページ", labelSingular: "ページ", supports: ["drafts", "revisions"] });
  mcp("schema_create_field", { collection: "pages", slug: "title", label: "ページ名（管理用）", type: "string", required: true });
  mcp("schema_create_field", { collection: "pages", slug: "seo_title", label: "ブラウザのタブ・検索結果のタイトル（空なら既定）", type: "string" });
  mcp("schema_create_field", { collection: "pages", slug: "seo_description", label: "検索結果の説明文（空なら既定）", type: "text" });
  mcp("schema_create_field", { collection: "pages", slug: "layout", label: "ページの中身（部品を並べる）", type: "blocks", validation: { allowedTypes: BLOCKS.map((b) => b.slug), maxItems: 30 } });
  console.log("collection created pages");
}

for (const p of PAGES) {
  const existing = mcp("content_list", { collection: "pages", limit: 100 });
  const items = existing.items ?? existing.entries ?? [];
  if (items.some((i) => i.slug === p.slug)) { console.log("page exists", p.slug); continue; }
  const created = mcp("content_create", { collection: "pages", slug: p.slug, status: "published", data: { title: p.title, layout: p.layout() } });
  console.log("page created", p.slug, created.item?.id ?? created.id);
}
console.log("media uploaded", media.size);
