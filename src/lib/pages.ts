// EmDash の pages コレクションから1ページ分を読む。無い・読めないときは null（呼び出し側の既定表示になる）
import { getEmDashEntry } from "emdash";

export type PageData = { title: string; seoTitle: string; seoDescription: string; layout: any[] };

export async function loadPage(slug: string): Promise<PageData | null> {
  try {
    const { entry } = await getEmDashEntry("pages", slug);
    if (!entry) return null;
    const d = entry.data as Record<string, any>;
    return {
      title: d.title ?? "",
      seoTitle: d.seo_title ?? "",
      seoDescription: d.seo_description ?? "",
      layout: Array.isArray(d.layout) ? d.layout : [],
    };
  } catch {
    return null;
  }
}
