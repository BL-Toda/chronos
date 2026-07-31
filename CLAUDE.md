# Chronos — タイムライン共有サービス

「Every event has context.」— 複数レイヤーで文脈を重ねられる年表作成・共有サービス。
現在はHTMLプロトタイプ段階。本リポジトリはClaude.aiでの設計フェーズからの移行。

## 共有環境（Cloudflare Workers）

- URL: https://chronos.babelinc.workers.dev （共有パスワードでログイン、関係者専用）
- 実体: `share/` — prototypes/ を静的アセット配信する認証ゲート付きWorker（eコンシェルmockup-shareと同方式）
- デプロイ: `cd share && npm run deploy` （プロトタイプ更新後はこれを実行するだけで反映）
- パスワード変更: `cd share && npx wrangler secret put SHARE_PASSWORD`

## ディレクトリ構成

- `prototypes/` — 単一HTMLのUIプロトタイプ（各画面が独立して動作）
  - `chronos-explore.html` — 年表一覧（Explore）**← 現在の作業対象、v2**
  - `chronos-viewer.html` / `chronos-screens.html` — 年表ビューア・主要画面
  - `chronos-lp-v2.html` — LP最新版
  - `chronos-logo-v2.html` — ロゴ探索版（Erode + Timeline Dot、旧案）
- `assets/chronos-logo.svg` — **確定ロゴ原本**（グラデーション円シンボル+白ワードマーク、5.7MB）
  - 配信用軽量版: `prototypes/assets/chronos-logo.svg`（埋め込みテクスチャを800pxに縮小、68KB）
  - シンボル単体: `assets/chronos-symbol.svg`（原本）/ `prototypes/assets/chronos-symbol.svg`（軽量版）
  - favicon: `prototypes/assets/favicon.png`（64px）+ `apple-touch-icon.png`（180px）。全プロトタイプ・共有環境のheadに設定済み
  - SVGはロゴぴったりのサイズのため、設置時はロゴ高さの50%以上のアイソレーションを確保する
  - `chronos-design-system.html` — デザインシステム一覧
- `docs/` — 仕様書・ブランドガイドライン・収支（docx/xlsx）
  - `chronos-brand-guidelines-v3.docx` — ブランドガイドライン最新版
  - `chronos-prelaunch-package.docx` — DB設計・利用規約
  - `chronos-api-design.docx` — API設計

## デザイントークン（全ページ共通・厳守）

- カラー: bg `#0A0A0C` / card `#16161A` / accent `#C8A87E` (Warm Gold) / text `#E8E4DE` / text2 `#8A8680`
- レイヤーカラー: Blue `#5B9BD5` / Green `#7BC67E` / Pink `#D4849A` / Gold `#C8B87E` / Purple `#9E7EC8`
- カテゴリカラー: 青 / ピンク / ゴールド / グリーン / オレンジ / パープル（explore参照）
- フォント: 見出し **Erode**（Fontshare, Medium 500, letter-spacing +8〜12px）/ 本文 **DM Sans** / 数値 **JetBrains Mono**
- トーン: 北欧的・静か・余白重視。コピーに「!」は使わない

## 未着手タスク: Explore v3（次の実装対象）

対象: `prototypes/chronos-explore.html`

1. 全年表カードにカバー画像を全面適用（画像アセットは無し → カテゴリカラーベースのSVG/CSSグラデーション生成型。年表テーマに合った抽象パターン）
2. いいね ♡ + ブックマーク 🔖 ボタンをカード/リスト両ビューに追加、両カウントを表示
3. ブックマークはローカル状態管理し、マイページにブックマークタブを追加
4. コンテナのmax-widthを撤廃し、フルード全幅レイアウトに（グリッドは `auto-fill/minmax`、ビューポート連動カラム数）

## DB設計メモ（docs/chronos-prelaunch-package.docx より）

- likes: `(user_id, timeline_id)` 複合PK、timelinesに `like_count` キャッシュ
- bookmarks: **未定義** → likesと同構造で新規追加想定
- 公開設定: public / unlisted / private + `share_id`
- マイページ: `chronos.app/@username`

## 規約

- プロトタイプは1ファイル完結のHTML（CSS/JS同梱）を維持
- 既存トークン・トーンから逸脱しない。新色・新フォントの追加は要相談
