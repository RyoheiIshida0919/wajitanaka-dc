import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// EmDash（Cloudflare Workers + D1 + R2）。お知らせ・診療時間・電話などは /_emdash/admin で編集する
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: "https://wajitanaka-dc.com",
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB", session: "auto", coalesce: true }),
      storage: r2({ binding: "MEDIA" }),
    }),
  ],
  devToolbar: { enabled: false },
});
