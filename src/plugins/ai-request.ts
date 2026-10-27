// EmDash 管理画面の「AIに改修を依頼」。依頼はダッシュボード(wajitanaka-dashboard)の依頼台帳へ送り、
// GitHub Actions 上の Claude Code が直して確認用ページを返す。公開はここで「公開する」を押したものだけ。
import { definePlugin } from "emdash";
import { manualBlocks } from "./manual";

const API = "https://wajitanaka-dashboard.ishida-a0f.workers.dev/api/agent";
const SITE = "https://wajitanaka-dc.ishida-a0f.workers.dev";
// 添付画像は依頼文の末尾に URL として書く（依頼台帳の形は変えない）。GitHub Actions 側がこの URL から画像を取り込む
const IMAGE_MARK = "【添付画像】";
// 管理画面のプラグイン画面はアップロード欄(media_picker)を描画しないため、「メディア」に上げた画像から選んでもらう
const IMAGE_KEYS = ["img1", "img2", "img3"];

async function imageFields() {
  let options: { label: string; value: string }[] = [];
  try {
    // 画像の公開URLは storage_key から作る（プラグイン用の media API は要ログインの URL しか返さないため、D1 を直接読む）
    const { env } = (await import("cloudflare:workers")) as any;
    const { results } = await env.DB.prepare(
      "SELECT filename, storage_key, created_at FROM media WHERE status = 'ready' AND mime_type LIKE 'image/%' ORDER BY created_at DESC LIMIT 40",
    ).all();
    options = results.map((m: any) => ({ label: `${m.filename}（${jst(m.created_at)}）`, value: `/_emdash/api/media/file/${m.storage_key}` }));
  } catch {}
  if (!options.length) return [];
  options.unshift({ label: "（なし）", value: "" });
  return IMAGE_KEYS.map((k, i) => ({ type: "select", action_id: k, label: `画像${i + 1}（あれば）`, options, initial_value: "" }));
}

function withImages(text: unknown, values: Record<string, unknown> = {}) {
  const urls = IMAGE_KEYS.map((k) => String(values[k] || "").trim())
    .filter(Boolean)
    .map((u) => (u.startsWith("/") ? SITE + u : u));
  const body = String(text || "").trim();
  return urls.length ? `${body}\n\n${IMAGE_MARK}\n${urls.join("\n")}` : body;
}

function imageBlocks(body: string): any[] {
  const urls = body.match(/https:\/\/wajitanaka-dc\.ishida-a0f\.workers\.dev\/_emdash\/api\/media\/file\/[^\s]+/g) || [];
  return urls.map((url, i) => ({ type: "image", url: url.slice(SITE.length), alt: `添付画像${i + 1}` }));
}

type Req = {
  id: number;
  created_at: string;
  name: string;
  body: string;
  status: string;
  preview_url: string;
  reply: string;
};

const STATUS: Record<string, string> = {
  new: "受付済み（作業待ち）",
  working: "AIが作業中",
  preview: "確認してください",
  publish: "公開の準備中",
  done: "公開済み",
  closed: "終了",
};

async function call(path: string, body?: unknown) {
  // 同じアカウントの workers.dev 同士は普通の fetch で届かない(1042)ので、サービスバインディング経由で呼ぶ
  const { env } = (await import("cloudflare:workers")) as any;
  const res = await env.DASHBOARD.fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${env.AGENT_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(data.error || "うまくいきませんでした。もう一度お試しください");
  return data;
}

const jst = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function requestBlocks(r: Req, imgs: any[]): any[] {
  const blocks: any[] = [
    { type: "divider" },
    { type: "section", text: `**No.${r.id}　${jst(r.created_at)}　${r.name}さん　［${STATUS[r.status] || r.status}］**\n${r.body}` },
    ...imageBlocks(r.body),
  ];
  if (r.reply) blocks.push({ type: "context", text: `AIより：${r.reply}` });
  if (r.status === "preview") {
    const elements: any[] = [];
    if (r.preview_url) elements.push({ type: "link", label: "仕上がりを見る", target: { kind: "external", url: r.preview_url }, appearance: "secondary" });
    elements.push(
      {
        type: "button",
        action_id: "publish",
        label: "公開する",
        style: "primary",
        value: r.id,
        confirm: { title: "この内容で公開しますか", text: "数分でホームページに反映されます。", confirm: "公開する", deny: "やめる" },
      },
      { type: "button", action_id: "cancel", label: "やめる", style: "secondary", value: r.id },
    );
    blocks.push({ type: "actions", elements });
    blocks.push({
      type: "form",
      block_id: `redo-${r.id}-${Date.now()}`, // 送るたびに block_id を変えて、空の入力欄を出し直す
      fields: [{ type: "text_input", action_id: "note", label: "もう少し直してほしいところ（あれば）", multiline: true }, ...imgs],
      submit: { label: "直してもらう", action_id: "redo" },
    });
  }
  if (r.status === "new") blocks.push({ type: "actions", elements: [{ type: "button", action_id: "cancel", label: "この依頼を取り消す", style: "secondary", value: r.id }] });
  return blocks;
}

async function render(ctx: any, toast?: { message: string; type: "success" | "error" | "info" }) {
  let list: Req[] = [];
  let loadError = "";
  try {
    list = ((await call("/requests")).requests as Req[]).slice(0, 20);
  } catch (e) {
    loadError = (e as Error).message;
  }
  const imgs = await imageFields();
  const blocks: any[] = [
    { type: "header", text: "AIに改修を依頼" },
    {
      type: "context",
      text: "ページの作りやデザインを変えたいとき、ページを追加したいときに、ふだんの言葉で書いて送ってください。見本の画面や使いたい写真は、先に左の「メディア」へアップロードしてから、下の「画像」欄で選んでください（3枚まで）。AIが直して、確認用ページを返します（通常10〜20分）。確認して「公開する」を押すと、ホームページに反映されます。各ページの文章・写真の差し替えやセクションの並べ替えは左の「ページ」から、お知らせ・診療時間・電話は「お知らせ」「医院情報」から、AIを通さずすぐ直せます。",
    },
    {
      type: "form",
      block_id: `new-${Date.now()}`,
      fields: [{ type: "text_input", action_id: "body", label: "直したいこと", multiline: true, placeholder: "例：医師紹介ページに院長の経歴を追加して" }, ...imgs],
      submit: { label: "送る", action_id: "create" },
    },
  ];
  blocks.push(
    { type: "context", text: "AIの返事はこの下に出ます。画面は自動では変わらないので、送ってしばらくしたら「返事を確認する」を押してください。" },
    { type: "actions", elements: [{ type: "button", action_id: "refresh", label: "返事を確認する", style: "secondary" }] },
  );
  if (loadError) blocks.push({ type: "banner", variant: "error", title: "依頼の一覧を読み込めませんでした", description: loadError });
  else if (!list.length) blocks.push({ type: "empty", title: "まだ依頼はありません" });
  else for (const r of list) blocks.push(...requestBlocks(r, imgs));
  return toast ? { blocks, toast } : { blocks };
}

const PAGES = [
  { path: "/requests", label: "AIに改修を依頼", icon: "sparkle" },
  { path: "/help", label: "使い方（マニュアル）", icon: "book" },
];

export function createPlugin() {
  return definePlugin({
    id: "ai-request",
    version: "0.1.0",
    routes: {
      admin: {
        handler: async (ctx: any) => {
          const input = ctx.input || {};
          if (input.type === "page_load" && input.page === "/help") return { blocks: manualBlocks() };
          try {
            if (input.type === "form_submit" && input.action_id === "create") {
              const user = ctx.user;
              await call("/create", { name: user?.name || user?.email || "管理画面", email: user?.email || "", body: withImages(input.values?.body, input.values) });
              return render(ctx, { message: "送りました。AIが作業を始めます", type: "success" });
            }
            if (input.type === "form_submit" && input.action_id === "redo") {
              const id = Number(String(input.block_id || "").split("-")[1]);
              await call("/action", { id, action: "redo", note: withImages(input.values?.note, input.values) });
              return render(ctx, { message: "追加の依頼を送りました", type: "success" });
            }
            if (input.type === "block_action" && (input.action_id === "publish" || input.action_id === "cancel")) {
              await call("/action", { id: Number(input.value), action: input.action_id });
              return render(ctx, { message: input.action_id === "publish" ? "公開をお願いしました" : "取り消しました", type: "success" });
            }
          } catch (e) {
            return render(ctx, { message: (e as Error).message, type: "error" });
          }
          if (input.type === "block_action" && input.action_id === "refresh") return render(ctx, { message: "最新の状態にしました", type: "info" });
          return render(ctx);
        },
      },
    },
    admin: {
      pages: PAGES,
    },
  });
}



// astro.config から登録する（EmDash は entrypoint のモジュールを読み込んで createPlugin() を呼ぶ）
export function aiRequestPlugin() {
  return { id: "ai-request", version: "0.1.0", format: "native" as const, entrypoint: "/src/plugins/ai-request.ts", adminPages: PAGES };
}
