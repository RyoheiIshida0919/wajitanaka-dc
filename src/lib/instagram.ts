// Instagram の最新投稿（Instagram API with Instagram Login）。
// 鍵は Worker の secret IG_TOKEN（長期トークン・60日）。期限切れを防ぐため、使ううちに自動で延長して KV に保存する。
// 投稿一覧も KV に30分ためておく（毎回 Instagram に問い合わせない）。鍵が無い・取得に失敗したときは空配列＝従来表示
export type IgPost = { url: string; image: string; caption: string };

const CACHE_KEY = "ig:posts";
const TOKEN_KEY = "ig:token";
const CACHE_MS = 30 * 60e3;
const REFRESH_MS = 7 * 24 * 3600e3;

export async function getInstagramPosts(limit = 3): Promise<IgPost[]> {
  try {
    const { env } = (await import("cloudflare:workers")) as any;
    const kv = env.SESSION;
    const cached = (await kv.get(CACHE_KEY, "json")) as { at: number; posts: IgPost[] } | null;
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.posts.slice(0, limit);

    const saved = (await kv.get(TOKEN_KEY, "json")) as { token: string; at: number } | null;
    let token: string = saved?.token || env.IG_TOKEN;
    if (!token) return [];
    if (!saved || Date.now() - saved.at > REFRESH_MS) {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
      if (r.ok) {
        token = ((await r.json()) as any).access_token || token;
        await kv.put(TOKEN_KEY, JSON.stringify({ token, at: Date.now() }));
      }
    }
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=media_type,media_url,thumbnail_url,permalink,caption&limit=6&access_token=${token}`,
    );
    if (!res.ok) return cached?.posts.slice(0, limit) ?? [];
    const posts: IgPost[] = (((await res.json()) as any).data || [])
      .map((m: any) => ({ url: m.permalink, image: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url, caption: (m.caption || "").slice(0, 80) }))
      .filter((p: IgPost) => p.url && p.image);
    await kv.put(CACHE_KEY, JSON.stringify({ at: Date.now(), posts }));
    return posts.slice(0, limit);
  } catch {
    return [];
  }
}

// 管理画面「Instagram連携」用。先方が発行した鍵をここで貼ってもらい、KV に保存する（Cloudflare を触らずに済むように）
export async function instagramStatus(): Promise<{ username: string } | null> {
  try {
    const { env } = (await import("cloudflare:workers")) as any;
    const saved = (await env.SESSION.get(TOKEN_KEY, "json")) as { token: string } | null;
    const token = saved?.token || env.IG_TOKEN;
    if (!token) return null;
    const r = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${token}`);
    return r.ok ? { username: ((await r.json()) as any).username } : null;
  } catch {
    return null;
  }
}

export async function saveInstagramToken(raw: unknown): Promise<string> {
  const token = String(raw || "").trim();
  if (!/^[A-Za-z0-9_\-|.]{20,}$/.test(token)) throw new Error("鍵の形が正しくありません。コピーし直して貼ってください");
  const r = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${token}`);
  if (!r.ok) throw new Error("この鍵ではInstagramにつながりませんでした。もう一度「トークンを生成」からやり直してください");
  const { username } = (await r.json()) as any;
  const { env } = (await import("cloudflare:workers")) as any;
  await env.SESSION.put(TOKEN_KEY, JSON.stringify({ token, at: Date.now() }));
  await env.SESSION.delete(CACHE_KEY);
  return username;
}
