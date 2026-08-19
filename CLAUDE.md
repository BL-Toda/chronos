# Chronos — タイムライン共有サービス

「Every event has context.」— 複数レイヤーで文脈を重ねられる年表作成・共有サービス。
現在はHTMLプロトタイプ段階。本リポジトリはClaude.aiでの設計フェーズからの移行。

## 共有環境（Cloudflare Workers）

- URL: https://chronos.babelinc.workers.dev （共有パスワードでログイン、関係者専用）
- 実体: `share/` — prototypes/ を静的アセット配信する認証ゲート付きWorker（eコンシェルmockup-shareと同方式）
- デプロイ: `cd share && npm run deploy` （プロトタイプ更新後はこれを実行するだけで反映）
- 一覧の表示名・グループ: `share/names.json` で管理（新規プロトタイプ追加時はここに登録。未登録は「未分類」で先頭表示）
- ヘッダー規則: アプリ画面・LPのヘッダー/ナビは高さ100px・ロゴ高さ40px
- パスワード変更: `cd share && npx wrangler secret put SHARE_PASSWORD`

## ディレクトリ構成

- `prototypes/` — 単一HTMLのUIプロトタイプ（各画面が独立して動作）
  - **現行版（2026-07-31確定）**: Explore=`chronos-explore.html`(v2・作業対象) / 閲覧の正=`chronos-viewer.html`（作成者ビューは「viewer+編集モード」方針、独立画面なし） / LP=`chronos-lp-v4.html`（ゼロから再設計、v3は参照用） / オンボーディング=`chronos-onboarding-v2.html` / 主要画面=`chronos-screens.html`
  - **アーカイブ**: chronos.html, chronos-v2, chronos-v3-multilayer, period-lanes, period-ui, onboarding(v1), lp, lp-v2, lp-v3, lp-brand, lp-launch, logo系2種, font系2種（参照時は歴史資料として扱う）
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
- レイヤーカラー（7色・確定）: Blue `#5B9BD5` / Green `#7BC67E` / Pink `#D4849A` / Gold `#C8B87E` / Purple `#9E7EC8` / Teal `#5BBCB4` / Orange `#D4A05A`
- カテゴリマスタ（6種・確定）: テクノロジー / 歴史・政治 / カルチャー / 科学・自然 / ビジネス / 個人・ライフ（色はexplore実装値を正とする）
- AI機能の呼称は「下書き」に統一。プラン正本: Free=生成月3回+Assist月10回 / Pro=¥800月・¥6,800年（「◯ヶ月分お得」表記は使わない）
- フォント: 見出し **Erode**（Fontshare, Medium 500, letter-spacing +8〜12px）/ 本文 **DM Sans** / 数値 **JetBrains Mono**
- トーン: 北欧的・静か・余白重視。コピーに「!」は使わない

## Explore v3 — 完了（2026-08-01）

`chronos-explore.html` はv3実装済み: 生成型カバー画像（シード決定論・カテゴリカラー6パターン）/ ♡🔖ボタン+カウント（カード・リスト両対応）/ フルード全幅グリッド / モバイル導線（ボトムシート型フィルタ+ハンバーガー）/ a11y（button化・focus-visible・コントラスト是正）。
ソーシャル状態はlocalStorageで画面間連携: `chronos_likes_v1`（id配列）/ `chronos_bookmarks_v1`（`{id,title,desc,cat,catName,likes}`配列）。マイページ（screens）にブックマークタブ、viewerにいいねボタン実装済み。

## 公開系UX — 完了（2026-08-01）

spec-v2-addendum の公開系UIを実装済み:
- creation-flow: Step 5「公開設定」（公開/限定公開/非公開の3択+共有URL発行+コピー、デフォルト非公開）、イベント編集パネル拡張（レイヤー割当チップ・信憑性3択+補足メモ・出典リスト）
- screens: 年表カードに公開設定モーダル（バッジ「公開中/限定公開/非公開」3種に統一、「下書き」文言廃止）
- `chronos-profile.html` 新規: 公開プロフィール @username（explore v3とカバー生成・いいね状態を共有。`?empty=1` で空状態）

## 法務（正: docs/legal/rollout-plan.md）

- Phase 1 は日本向け簡潔版3本（`docs/legal/ja/` terms / privacy / tokushoho）。法務ページ `prototypes/chronos-legal.html` は `node docs/legal/build/build-legal.js` で Markdown から再生成
- 決定事項: 登録13歳以上（13〜17歳は保護者同意の表明、Pro購入は18歳以上・日本居住者のみ）/ 非公開・限定公開の年表とAI入力はAI学習に不使用、公開年表はサービス改善に利用可（モデル学習は事前告知+オプトアウト）/ 上限付き責任制限（軽過失¥10,000）/ 法令上必須でない定期義務は負わない / ウェイトリスト無しで即時公開
- 実装時は `docs/legal/implementation-requirements.md`（64要件）を spec-v2-addendum と併読。多法域版は `docs/legal/archive/multi-jurisdiction/`
- 残TODO: 会社情報（登記商号・代表者・番地・電話）、責任上限額の可否、日本の弁護士レビュー

## 次の実装候補

- Next.js + Supabase + Cloudflare の雛形構築（再実装方針）
- LPのFramer移行検討

## DB・API設計（正: docs/chronos-spec-v2-addendum.md）

2026-07-31の全体レビューと意思決定（docs/chronos-decisions-draft-20260731.md、全項目確定済み）を反映した
**仕様補遺 v2 = docs/chronos-spec-v2-addendum.md が実装時の正**。docx原本はv1参照。要点:

- events: `end_date`+`event_type('point','period')`+`summary/detail` 2階層
- bookmarks/reports 新設、timelines に language・年代キャッシュ・bookmark_count・cover_seed
- 公開設定: public / unlisted / private + `share_id`（「下書き」ステータスは作らない。デフォルト非公開）
- 認証: Google/Apple OAuthのみ（マジックリンク不採用）
- マイページ（私的ダッシュボード）と公開プロフィール `chronos.app/@username` は別画面
- 再実装方針: Next.js(App Router) + Supabase + Cloudflare の一体型。LPはFramer移行を検討中

## 規約

- プロトタイプは1ファイル完結のHTML（CSS/JS同梱）を維持
- 既存トークン・トーンから逸脱しない。新色・新フォントの追加は要相談
