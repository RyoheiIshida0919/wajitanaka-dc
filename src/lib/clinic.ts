// EmDash の「医院情報」（1件だけの entry "main"）と「お知らせ」を読む。
// 取得に失敗したり未入力の項目は、従来のサイトの値で表示する。
import type { AstroGlobal } from "astro";
import { getEmDashCollection, getEmDashEntry } from "emdash";

export type HoursRow = { label: string; days: boolean[] };
export type Clinic = {
  alertOn: boolean;
  alertText: string;
  alertLink: string;
  hours: HoursRow[];
  hoursNote: string;
  tel: string;
  reserveUrl: string;
  questionnaireUrl: string;
};
export type News = { id: string; date: string; title: string; body: string; link: string; pinned: boolean };

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DEFAULT: Clinic = {
  alertOn: false,
  alertText: "",
  alertLink: "",
  hours: [
    { label: "8:45-13:30", days: [true, true, true, true, true, true, false] },
    { label: "13:30-16:30", days: [true, true, true, true, true, false, false] },
  ],
  hoursNote: "",
  tel: "053-489-8185",
  reserveUrl: "https://planetdentale.com/reserve/about.php?web_code=24da7c41f707a2b72d5ac93333b5fd819538b22b405ac3c5f874c15400a2c0ae",
  questionnaireUrl: "https://forms.gle/7NgJVgftCjhT28Do6",
};

const httpUrl = (u: unknown) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : "");

async function loadClinic(): Promise<Clinic> {
  try {
    const { entry } = await getEmDashEntry("clinic", "main");
    const d = (entry?.data ?? {}) as Record<string, any>;
    const rows: HoursRow[] = Array.isArray(d.hours)
      ? d.hours.filter((r: any) => r?.label).map((r: any) => ({ label: String(r.label), days: DAY_KEYS.map((k) => !!r[k]) }))
      : [];
    return {
      alertOn: !!d.alert_on && !!d.alert_text,
      alertText: d.alert_text || "",
      alertLink: httpUrl(d.alert_link),
      hours: rows.length ? rows : DEFAULT.hours,
      hoursNote: d.hours_note || "",
      tel: d.tel || DEFAULT.tel,
      reserveUrl: httpUrl(d.reserve_url) || DEFAULT.reserveUrl,
      questionnaireUrl: httpUrl(d.questionnaire_url) || DEFAULT.questionnaireUrl,
    };
  } catch {
    return DEFAULT;
  }
}

async function loadNews(): Promise<News[]> {
  try {
    const { entries } = await getEmDashCollection("news", { orderBy: { published_at: "desc" }, limit: 20 });
    return entries
      .map((e: any) => ({
        id: e.id,
        date: (e.data.publishedAt ? new Date(e.data.publishedAt) : new Date()).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }),
        title: e.data.title || "",
        body: e.data.body || "",
        link: httpUrl(e.data.link),
        pinned: !!e.data.pinned,
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// 1回の表示の中で何度呼んでも、取得は1回にする
export function getClinic(Astro: AstroGlobal): Promise<Clinic> {
  const l = Astro.locals as any;
  return (l.__clinic ??= loadClinic());
}
export function getNews(Astro: AstroGlobal): Promise<News[]> {
  const l = Astro.locals as any;
  return (l.__news ??= loadNews());
}
