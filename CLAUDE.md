# 和地たなか歯科 公式サイト 更新ルール（Claude向け）

このリポジトリは和地たなか歯科の公式サイト（Astro 静的サイト）。更新するのは歯科医院のスタッフで、プログラミングの専門知識はない。専門用語を避け、日本語で簡潔に説明する。

## 公開の仕組み（2026-10 EmDash へ移行）

- サイトは EmDash（Astro）で Cloudflare Workers に公開している。`main` に push すると Workers Builds が自動で本番（https://wajitanaka-dc.ishida-a0f.workers.dev/）へ反映する（1〜2分）。
- 旧 https://wajitanaka-dc.pages.dev/ は新サイトへ転送するだけ。独自ドメイン wajitanaka-dc.com はまだ STUDIO のまま（切り替えは未定）。
- 確認用ページは `npx wrangler versions upload --preview-alias <名前>` で作る（https://<名前>-wajitanaka-dc.ishida-a0f.workers.dev/）。

## 中身の編集は EmDash の管理画面で

管理画面 https://wajitanaka-dc.ishida-a0f.workers.dev/_emdash/admin（パスキーでログイン）。
- 「ページ」：各ページの文章・写真・セクションの並び（layout ブロック）。表示は `src/components/PageBlocks.astro` が部品を並べる。部品は値が空なら従来の内容で表示する（`src/lib/blocks.ts`）
- 「お知らせ」「医院情報」：お知らせ・緊急のお知らせ・診療時間・電話・予約URL（`src/lib/clinic.ts` が読む）
- 「AIに改修を依頼」：デザイン変更・新しいセクションなど。GitHub Actions の Claude が直して確認用ページを返す
- 文章や写真だけの変更をコードで直さない（管理画面の値が優先される）。新しい種類のセクションを作ったら、`scripts/setup-blocks.mjs` を参考に EmDash へ部品の定義を登録する（`node scripts/emdash-mcp.mjs`）

## 更新の進め方（必ず守る）

1. 依頼内容を一言で復唱する。曖昧なら1回だけ質問する。
2. `main` から作業用ブランチ（例 `update/2026-11-休診日`）を切って編集する。
3. `npm run build` が成功することを確認する。失敗したら公開しない。
4. 作業用ブランチを push し、Cloudflareの確認用URLをスタッフに伝えて目視確認してもらう。
5. スタッフが「公開して」と言ったときだけ `main` に統合して push する。
6. 公開後、本番URLを単独の行で返す。

軽微な文言修正（誤字、電話番号、時間の変更）で、スタッフが「すぐ公開」と明示した場合は、手順4を省いて `main` へ直接でよい。

## 触ってよい場所と触ってはいけない場所

### よく更新する場所

| 内容 | ファイル |
|------|---------|
| 診療時間 | `src/components/Footer.astro`（表）、`src/layouts/BaseLayout.astro`（検索エンジン向けデータ `openingHoursSpecification`）。両方を必ず同時に直す |
| 電話番号・住所 | `Footer.astro`、`Access.astro`、`BaseLayout.astro`。複数箇所にあるので `grep` で全箇所を洗い出して直す |
| Web予約URL | `Header.astro`、`Footer.astro`、`StickyFooterCTA.astro`、`CTASection.astro`、`Access.astro`、`Features.astro` の `reserveUrl`。全て同じ値に揃える |
| お知らせ | `src/components/sections/Instagram.astro`（現在はInstagramへの誘導のみ） |
| ブログ | `.env` の note のURL設定（`.env.example` 参照）。設定するとブログページに埋め込まれる |
| 医師紹介 | `src/pages/doctors.astro` |
| 患者さんの声・FAQ | `src/pages/reviews.astro`、`src/components/sections/ReviewsFAQ.astro` |
| 求人 | `src/pages/recruit.astro` |
| 写真 | `public/images/` 配下 |

### 触らない場所（依頼されても、まず確認する）

- `src/styles/global.css`（色・余白・フォントの共通設定）。変えると全ページの見た目が変わる。
- `src/layouts/BaseLayout.astro` の構造部分（`openingHoursSpecification` などデータ部分以外）。
- `astro.config.mjs`、`package.json`、`package-lock.json`。
- `public/site.webmanifest`、`public/favicon.svg`。
- トップページ（`index.astro`）のセクションの並び順。変更が必要なときは、変更前の見た目を伝えてから行う。

## 写真の追加

- `public/images/` の適切なフォルダ（`clinic` / `doctors` / `features` / `hero` / `site`）に置く。
- 幅1920px以下、1ファイル500KB程度までに縮小する。
- ファイル名は半角英数字とハイフンだけにする（日本語・空白は使わない）。
- 患者さんの顔が写っている写真は、スタッフに掲載許可の有無を確認してから使う。

## 書き方のルール

- 医療広告ガイドライン上、「最高」「日本一」「絶対」「必ず治る」など、誇大・比較優良表現は書かない。迷ったらスタッフに確認する。
- 既存のコンポーネントと同じ書き方・クラス名を使う。新しいCSSは最小限にする。
- 見出しの横に色付きの縦線（左ボーダー）は使わない。
- 既存の文体（です・ます調）に合わせる。

## 事故を防ぐ

- 公開後におかしいと言われたら、原因を探す前に `git revert` で直前の状態へ戻し、その旨を伝える。
- 個人情報（患者さんの氏名・症例の特定につながる情報）をページやコミットメッセージに入れない。
- 判断に迷う変更は実行せず、制作担当（バンソウズ合同会社 石田）に相談するようスタッフに案内する。
