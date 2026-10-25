// EmDash 管理画面の「AIに改修を依頼」。依頼はダッシュボード(wajitanaka-dashboard)の依頼台帳へ送り、
// GitHub Actions 上の Claude Code が直して確認用ページを返す。公開はここで「公開する」を押したものだけ。
import { definePlugin } from "emdash";

const API = "https://wajitanaka-dashboard.ishida-a0f.workers.dev/api/agent";

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
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.AGENT_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(data.error || "うまくいきませんでした。もう一度お試しください");
  return data;
}

const jst = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function requestBlocks(r: Req): any[] {
  const blocks: any[] = [
    { type: "divider" },
    { type: "section", text: `**No.${r.id}　${jst(r.created_at)}　${r.name}さん　［${STATUS[r.status] || r.status}］**\n${r.body}` },
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
      block_id: `redo-${r.id}`,
      fields: [{ type: "text_input", action_id: "note", label: "もう少し直してほしいところ（あれば）", multiline: true }],
      submit: { label: "直してもらう", action_id: "redo" },
    });
  }
  if (r.status === "new") blocks.push({ type: "actions", elements: [{ type: "button", action_id: "cancel", label: "この依頼を取り消す", style: "secondary", value: r.id }] });
  return blocks;
}

async function render(toast?: { message: string; type: "success" | "error" | "info" }) {
  let list: Req[] = [];
  let loadError = "";
  try {
    list = ((await call("/requests")).requests as Req[]).slice(0, 20);
  } catch (e) {
    loadError = (e as Error).message;
  }
  const blocks: any[] = [
    { type: "header", text: "AIに改修を依頼" },
    {
      type: "context",
      text: "ページの作りやデザインを変えたいとき、ページを追加したいときに、ふだんの言葉で書いて送ってください。AIが直して、確認用ページを返します（通常10〜20分）。確認して「公開する」を押すと、ホームページに反映されます。お知らせ・診療時間・電話は、左のメニューの「お知らせ」「医院情報」からすぐ直せます。",
    },
    {
      type: "form",
      block_id: "new",
      fields: [{ type: "text_input", action_id: "body", label: "直したいこと", multiline: true, placeholder: "例：医師紹介ページに院長の経歴を追加して" }],
      submit: { label: "送る", action_id: "create" },
    },
  ];
  if (loadError) blocks.push({ type: "banner", variant: "error", title: "依頼の一覧を読み込めませんでした", description: loadError });
  else if (!list.length) blocks.push({ type: "empty", title: "まだ依頼はありません" });
  else for (const r of list) blocks.push(...requestBlocks(r));
  return toast ? { blocks, toast } : { blocks };
}

export function createPlugin() {
  return definePlugin({
    id: "ai-request",
    version: "0.1.0",
    routes: {
      admin: {
        handler: async (ctx: any) => {
          const input = ctx.input || {};
          try {
            if (input.type === "form_submit" && input.action_id === "create") {
              const user = ctx.user;
              await call("/create", { name: user?.name || user?.email || "管理画面", email: user?.email || "", body: input.values?.body });
              return render({ message: "送りました。AIが作業を始めます", type: "success" });
            }
            if (input.type === "form_submit" && input.action_id === "redo") {
              const id = Number(String(input.block_id || "").replace("redo-", ""));
              await call("/action", { id, action: "redo", note: input.values?.note });
              return render({ message: "追加の依頼を送りました", type: "success" });
            }
            if (input.type === "block_action" && (input.action_id === "publish" || input.action_id === "cancel")) {
              await call("/action", { id: Number(input.value), action: input.action_id });
              return render({ message: input.action_id === "publish" ? "公開をお願いしました" : "取り消しました", type: "success" });
            }
          } catch (e) {
            return render({ message: (e as Error).message, type: "error" });
          }
          return render();
        },
      },
    },
    admin: {
      pages: [{ path: "/requests", label: "AIに改修を依頼", icon: "sparkle" }],
    },
  });
}

const PAGES = [{ path: "/requests", label: "AIに改修を依頼", icon: "sparkle" }];

// astro.config から登録する（EmDash は entrypoint のモジュールを読み込んで createPlugin() を呼ぶ）
export function aiRequestPlugin() {
  return { id: "ai-request", version: "0.1.0", format: "native" as const, entrypoint: "/src/plugins/ai-request.ts", adminPages: PAGES };
}
