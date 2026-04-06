# 和地たなか歯科 - 公式サイト

Astro + Cloudflare Pages で構築された歯科医院トップページ。

---

## ディレクトリ構成

```
website/
├── public/
│   ├── favicon.svg                    # TODO: 実際のファビコンに差し替え
│   ├── site.webmanifest
│   └── images/
│       ├── hero/
│       │   └── hero-main.jpg          # TODO: ヒーロー画像を配置
│       ├── clinic/
│       │   ├── concept.jpg            # TODO: 医院コンセプト写真
│       │   ├── clinic-room.jpg        # TODO: 個室診察室の写真
│       │   ├── clinic-reception.jpg   # TODO: 受付・待合室の写真
│       │   └── clinic-equipment.jpg   # TODO: 診療設備の写真
│       ├── features/
│       │   ├── childcare.jpg          # TODO: 託児サービスの写真
│       │   ├── doctor-female.jpg      # TODO: 女性歯科医師の写真
│       │   └── sedation.jpg           # TODO: リラックス診察の写真
│       ├── doctors/                   # TODO: 医師紹介写真（将来用）
│       └── og-default.jpg             # TODO: OGP画像（1200×630px推奨）
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro           # 全ページ共通 HTML構造・SEO
│   ├── components/
│   │   ├── Header.astro               # グローバルナビゲーション
│   │   ├── Footer.astro               # フッター
│   │   └── sections/
│   │       ├── Hero.astro             # ファーストビュー
│   │       ├── Features.astro         # 選ばれる6つの理由
│   │       ├── Concept.astro          # 医院の考え方
│   │       ├── Treatments.astro       # 診療案内
│   │       ├── Environment.astro      # 院内環境
│   │       ├── ChildCare.astro        # 託児・女性医師
│   │       ├── Sedation.astro         # リラックス歯科
│   │       ├── CTASection.astro       # 予約CTA
│   │       ├── ClinicInfo.astro       # 医院情報・診療時間
│   │       └── Access.astro           # アクセス・地図
│   ├── pages/
│   │   └── index.astro                # トップページ
│   └── styles/
│       └── global.css                 # 色・余白・フォント変数
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 差し替えが必要な箇所一覧

### 最優先（公開前に必須）

| 箇所 | ファイル | 内容 |
|------|---------|------|
| 電話番号 | Header.astro, Footer.astro, ClinicInfo.astro, CTASection.astro | `000-0000-0000` を実際の番号に |
| Web予約URL | 各CTAボタン | `https://example.com/reserve` を予約システムURLに |
| 住所 | ClinicInfo.astro, Access.astro, Footer.astro | 実際の郵便番号・番地に |
| 診療時間 | ClinicInfo.astro, Header.astro(モバイルメニュー), Footer.astro | 実際の時間に |
| Googleマップ | Access.astro | iframe の src を実際の埋め込みURLに |
| メタディスクリプション | index.astro | 実際の内容に微調整 |
| 本番ドメイン | astro.config.mjs | `site` の値を変更 |

### 画像差し替え

| ファイル | パス | 推奨サイズ |
|---------|------|-----------|
| ヒーロー背景 | `/public/images/hero/hero-main.jpg` | 1440×900px |
| OGP画像 | `/public/images/og-default.jpg` | 1200×630px |
| 医院コンセプト写真 | `/public/images/clinic/concept.jpg` | 1120×840px |
| 院内環境（3枚） | `/public/images/clinic/clinic-*.jpg` | 1120×840px |
| 託児写真 | `/public/images/features/childcare.jpg` | 960×640px |
| 女性医師写真 | `/public/images/features/doctor-female.jpg` | 960×640px |
| ファビコン | `/public/favicon.svg` | SVG推奨 |

画像を配置したら各コンポーネント内のコメントアウトを解除してください（`<!-- 実際の画像: →`の箇所）。

### 構造化データ (SEO)

`BaseLayout.astro` の `<script type="application/ld+json">` 内：
- `streetAddress`
- `postalCode`
- `telephone`
- `openingHoursSpecification`

---

## ローカル開発

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動（http://localhost:4321）
npm run dev

# 本番ビルド（dist/ フォルダに出力）
npm run build

# ビルド結果のプレビュー
npm run preview
```

---

## GitHub + Cloudflare Pages 公開手順

### 1. GitHubリポジトリを作成

```bash
cd website

# Gitを初期化
git init
git add .
git commit -m "initial commit: 和地たなか歯科トップページ"

# GitHubにリポジトリを作成（ブラウザで github.com → New repository）
# リポジトリ名例: wajitanaka-dc-website

git remote add origin https://github.com/YOUR_USERNAME/wajitanaka-dc-website.git
git branch -M main
git push -u origin main
```

### 2. Cloudflare Pages に接続

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. GitHubアカウントを接続し、`wajitanaka-dc-website` リポジトリを選択
4. ビルド設定：
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Save and Deploy** をクリック

### 3. カスタムドメインの設定（任意）

1. Cloudflare Pages のプロジェクト設定 → **Custom domains**
2. `wajitanaka-dc.com` を追加
3. DNSレコードを設定（Cloudflare管理のドメインなら自動）

---

## 更新・保守の方法（Claude Codeで）

```bash
# ファイルを編集後
git add .
git commit -m "update: ○○を修正"
git push
```

GitHubにpushするだけで Cloudflare Pages が自動ビルド・デプロイします。

---

## 将来の下層ページ追加方針

1. `src/pages/` 以下に `.astro` ファイルを追加するだけでページが増えます
   - 例: `src/pages/about.astro` → `/about` として公開される
2. `BaseLayout.astro` を継承してコンテンツを書くだけ
3. ナビゲーションは `Header.astro` の `navItems` 配列に追記

```astro
// 例: 一般歯科ページ
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
---
<BaseLayout title="一般歯科｜和地たなか歯科" description="...">
  <Header />
  <main>
    <!-- コンテンツ -->
  </main>
  <Footer />
</BaseLayout>
```

4. noteリンクを追加したい場合は `Footer.astro` のコメントアウト部分を解除してURLを設定

---

## デザイントークン（色・余白・フォント）

すべて `src/styles/global.css` の `:root` で管理。
色やサイズを変えたい場合はここだけ編集すればOK。

```css
--color-primary: #3B82C4;   /* メインブルー */
--color-accent:  #E8704A;   /* CTAボタン色（コーラル） */
--color-secondary: #5BBFB8; /* ティール（安心感） */
```
