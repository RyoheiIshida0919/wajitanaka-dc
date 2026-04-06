import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Cloudflare Pages 用の静的出力設定
  output: 'static',

  // 現在の公開URL
  site: 'https://wajitanaka-dc.pages.dev',

  // ビルド最適化
  build: {
    assets: 'assets',
  },
});
