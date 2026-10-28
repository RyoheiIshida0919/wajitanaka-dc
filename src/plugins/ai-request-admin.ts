// 「AIに改修を依頼」の管理画面（React）。中身は ai-request.ts が返すブロックをそのまま描き、
// その上に画像の貼り付け欄を足す。標準のブロック画面には貼り付け欄が無く、メディアに登録させると気軽に送れないため。
// 貼った画像は「送る」「直してもらう」と一緒に依頼台帳へ送るだけで、サイトのメディアには入れない
import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import { BlockRenderer } from "@emdash-cms/blocks";

const MAX_IMAGES = 3;
const MAX_SIDE = 1600;

type Img = { mime: string; data: string; preview: string };

// スクリーンショットをそのまま送ると重いので、長い辺1600pxのJPEGにする
async function shrink(file: File): Promise<Img> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.85);
  return { mime: "image/jpeg", data: preview.split(",")[1], preview };
}

// 「仕上がりを見る」などのリンク。渡さないとボタンが描かれない
const resolveLinkTarget = (t: any) => (t?.kind === "external" && /^https:\/\//.test(t.url) ? t.url : null);

async function post(page: string, interaction: any) {
  const res = await fetch("/_emdash/api/plugins/ai-request/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
    body: JSON.stringify({ ...interaction, page }),
  });
  if (!res.ok) throw new Error(`うまくいきませんでした（${res.status}）`);
  return (await res.json()).data as { blocks: any[]; toast?: { message: string; type: string } };
}

function PastePanel({ images, setImages, busy }: { images: Img[]; setImages: (f: (v: Img[]) => Img[]) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState("");
  const add = useCallback(
    async (files: File[]) => {
      const list = files.filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      setNote("");
      try {
        const done = await Promise.all(list.map(shrink));
        setImages((v) => {
          const next = [...v, ...done];
          if (next.length > MAX_IMAGES) setNote(`画像は${MAX_IMAGES}枚までです`);
          return next.slice(0, MAX_IMAGES);
        });
      } catch {
        setNote("この画像は読み込めませんでした");
      }
    },
    [setImages],
  );
  // ページのどこで貼っても受け取る（入力欄に文字を貼るときは画像が無いので邪魔しない）
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  return h(
    "div",
    {
      onDragOver: (e: any) => { e.preventDefault(); setDrag(true); },
      onDragLeave: () => setDrag(false),
      onDrop: (e: any) => { e.preventDefault(); setDrag(false); add(Array.from(e.dataTransfer.files || [])); },
      className: `rounded-lg border-2 border-dashed p-4 text-sm ${drag ? "border-kumo-brand bg-kumo-brand/5" : "border-kumo-line"}`,
    },
    h("div", { className: "flex flex-wrap items-center gap-3" },
      h("span", { className: "font-semibold" }, "画像を付ける（あれば）"),
      h("button", { type: "button", disabled: busy, onClick: () => input.current?.click(), className: "rounded-md border border-kumo-line px-3 py-1 hover:bg-kumo-tint" }, "画像を選ぶ"),
      h("input", { ref: input, type: "file", accept: "image/*", multiple: true, hidden: true, onChange: (e: any) => { add(Array.from(e.target.files || [])); e.target.value = ""; } }),
    ),
    h("p", { className: "mt-2 text-kumo-subtle" },
      "スクリーンショットやメモ書きの写真を、Ctrl+V（Macは ⌘+V）で貼るか、ここへドラッグしてください（3枚まで）。次に「送る」か「直してもらう」を押した依頼に付きます。ホームページの画像置き場には入りません。"),
    note ? h("p", { className: "mt-1 text-kumo-danger" }, note) : null,
    images.length
      ? h("div", { className: "mt-3 flex flex-wrap gap-3" },
          images.map((im, i) =>
            h("div", { key: i, className: "relative" },
              h("img", { src: im.preview, alt: `貼った画像${i + 1}`, className: "h-24 w-auto rounded border border-kumo-line" }),
              h("button", {
                type: "button",
                onClick: () => setImages((v) => v.filter((_, j) => j !== i)),
                className: "absolute -right-2 -top-2 rounded-full border border-kumo-line bg-kumo-base px-2 text-xs",
                "aria-label": "この画像を外す",
              }, "×"),
            ),
          ),
        )
      : null,
  );
}

function BlocksPage({ page, paste }: { page: string; paste: boolean }) {
  const [blocks, setBlocks] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Img[]>([]);

  const send = useCallback(
    async (interaction: any) => {
      const submit = interaction.type === "form_submit" && (interaction.action_id === "create" || interaction.action_id === "redo");
      if (submit && images.length) interaction = { ...interaction, values: { ...interaction.values, images: images.map(({ mime, data }) => ({ mime, data })) } };
      setBusy(true);
      try {
        const data = await post(page, interaction);
        setBlocks(data.blocks);
        setError("");
        setToast(data.toast || null);
        if (submit && data.toast?.type === "success") setImages([]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [page, images],
  );

  useEffect(() => { send({ type: "page_load", page }); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!blocks) return h("p", { className: "py-16 text-center text-kumo-subtle" }, error || "読み込み中…");
  // 貼り付け欄は最初の入力欄（新しい依頼）のすぐ下に置く
  const at = paste ? blocks.findIndex((b) => b.type === "form") + 1 : 0;
  const parts = at > 0 ? [blocks.slice(0, at), blocks.slice(at)] : [blocks, []];
  return h("div", { className: `relative flex flex-col gap-4 ${busy ? "opacity-70" : ""}` },
    toast ? h("div", { className: `rounded-md p-3 text-sm ${toast.type === "error" ? "bg-kumo-danger/10 text-kumo-danger" : "bg-kumo-brand/10"}` }, toast.message) : null,
    error ? h("div", { className: "rounded-md bg-kumo-danger/10 p-3 text-sm text-kumo-danger" }, error) : null,
    h(BlockRenderer, { blocks: parts[0], onAction: send, resolveLinkTarget }),
    at > 0 ? h(PastePanel, { images, setImages, busy }) : null,
    parts[1].length ? h(BlockRenderer, { blocks: parts[1], onAction: send, resolveLinkTarget }) : null,
  );
}

export const pages = {
  "/requests": () => h(BlocksPage, { page: "/requests", paste: true }),
  "/instagram": () => h(BlocksPage, { page: "/instagram", paste: false }),
  "/help": () => h(BlocksPage, { page: "/help", paste: false }),
};
