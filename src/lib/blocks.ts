// ブロック（EmDash の blocks フィールド）の値を表示用に整える。
// 値が空のときは各部品に書いた今までの内容で表示するので、見た目が崩れない。
import type { AstroGlobal } from "astro";

type MediaValue = { src?: string; alt?: string; meta?: { storageKey?: string } } | null | undefined;

// 画像欄の値からURLを作る。未設定なら fallback（public/images の元の写真）
export function imgSrc(Astro: AstroGlobal, img: MediaValue, fallback = ""): string {
  if (!img) return fallback;
  if (img.src) return img.src;
  const key = img.meta?.storageKey;
  if (key) return (Astro.locals as any).emdash?.getPublicMediaUrl?.(key) ?? `/_emdash/api/media/file/${key}`;
  return fallback;
}

export const imgAlt = (img: MediaValue, fallback = "") => (img && img.alt) || fallback;

// 空文字・未設定なら既定値
export const or = <T>(v: T | null | undefined | "", d: T): T => (v === undefined || v === null || v === "" ? d : v);

// 改行を <br> で表示するための行分け
export const lines = (text: string | null | undefined) => String(text ?? "").split(/\r?\n/);

export const list = <T>(v: T[] | null | undefined, d: T[]): T[] => (Array.isArray(v) && v.length ? v : d);
