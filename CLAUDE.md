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
  - **DB接続済み（2026-08-25）**: viewer=`?slug=`でSupabase RESTから実データ描画（紀元前対応・信憑性バッジ・出典・強調/段落描画・レイヤー7色可変）/ explore=実90本をフィード表示（取得失敗時は旧モックにフォールバック）/ explore・profileのカードは `viewer.html?slug=` にリンク。publishable keyは公開可のため埋め込みOK（RLSで公開年表のSELECTのみ）
  - **現行版（2026-07-31確定）**: Explore=`explore.html`(v2・作業対象) / 閲覧の正=`viewer.html`（作成者ビューは「viewer+編集モード」方針、独立画面なし） / LP=`lp-v4.html`（ゼロから再設計、v3は参照用） / オンボーディング=`onboarding-v2.html` / 主要画面=`screens.html`
  - **アーカイブ**: `prototypes/archive/`（Explore写真カバー旧案2本）, app-v1 / app-v2 / app-v3-multilayer, period-lanes, period-ui, onboarding-v1, lp-v1 / lp-v2, lp-brand, lp-launch, logo系2種, font系2種（参照時は歴史資料として扱う）
- `assets/chronos-logo.svg` — **確定ロゴ原本**（グラデーション円シンボル+白ワードマーク、5.7MB）
  - 配信用軽量版: `prototypes/assets/chronos-logo.svg`（埋め込みテクスチャを800pxに縮小、68KB）
  - シンボル単体: `assets/chronos-symbol.svg`（原本）/ `prototypes/assets/chronos-symbol.svg`（軽量版）
  - favicon: `prototypes/assets/favicon.png`（64px）+ `apple-touch-icon.png`（180px）。全プロトタイプ・共有環境のheadに設定済み
  - SVGはロゴぴったりのサイズのため、設置時はロゴ高さの50%以上のアイソレーションを確保する
  - `design-system.html` — デザインシステム一覧
- `docs/` — 仕様書・ブランドガイドライン・収支（docx/xlsx）
  - `chronos-brand-guidelines-v3.docx` — ブランドガイドライン最新版
  - `chronos-prelaunch-package.docx` — DB設計・利用規約
  - `chronos-api-design.docx` — API設計

## デザイントークン（全ページ共通・厳守）

- **カラーとタイプスケールの正は `docs/color-palette-2026-08.md` と `docs/design-system-2026-08.md`**。bg `#0A0A0C` / card `#16161A` / text `#E8E4DE` / text2 `#9A9590` / accent `#B8B4AE`（2026-08-25にゴールド `#C8A87E` を廃止しモノトーン化。彩度を持つのはレイヤー7色だけ）
- レイヤーカラー（7色・確定）: Blue `#5B9BD5` / Green `#7BC67E` / Pink `#D4849A` / Gold `#C8B87E` / Purple `#9E7EC8` / Teal `#5BBCB4` / Orange `#D4A05A`
- カテゴリマスタ（6種・確定）: テクノロジー / 歴史・政治 / カルチャー / 科学・自然 / ビジネス / 個人・ライフ（色はexplore実装値を正とする）
- AI機能の呼称は「下書き」に統一。プラン正本: Free=生成月3回+Assist月10回 / Pro=¥800月・¥6,800年（「◯ヶ月分お得」表記は使わない）
- フォント: 見出し **Erode** / 本文 **DM Sans** / データ **JetBrains Mono**（各400・500・700）。**年月の数字は DM Sans + tabular-nums、イベント数などのデータは mono**
- タイプスケールは5段（display / title / body / sm / xs）。行間は偶数px固定、余白は4の倍数
- トーン: 北欧的・静か・余白重視。UIコピーに「!」は使わない（シードコンテンツはペルソナ許可制で例外あり）

## Explore v3 — 完了（2026-08-01）

`explore.html` はv3実装済み: **カバーはUnsplash写真が正**（2026-08-19確定。カテゴリ別8枚×6=48枚をPHOTO_POOLに固定埋め込み、seed決定論で選択、生成型SVGカバーは読み込み中プレースホルダ兼フォールバック。APIキーはプロトタイプに置かない。本番はサーバー側でUnsplash API+attribution+download tracking）/ マイクロインタラクション（写真フェードイン・hover微拡大・IO reveal・♡ポップ・フィルタ切替クロスフェード・年代範囲線・積層バー（カバー上の年代ベースラインにレイヤー色の短いバーをseed決定論で重ねる。旧ドット行は廃止）・件数カウントアップ・空状態線画・ボトムシートのスワイプ閉じ・ブックマーク初回ヒント。すべて prefers-reduced-motion で無効）/ ♡🔖ボタン+カウント（カード・リスト両対応）/ フルード全幅グリッド / モバイル導線（ボトムシート型フィルタ+ハンバーガー）/ a11y（button化・focus-visible・コントラスト是正）。
ソーシャル状態はlocalStorageで画面間連携: `chronos_likes_v1`（id配列）/ `chronos_bookmarks_v1`（`{id,title,desc,cat,catName,likes}`配列）。マイページ（screens）にブックマークタブ、viewerにいいねボタン実装済み。

## 公開系UX — 完了（2026-08-01）

spec-v2-addendum の公開系UIを実装済み:
- creation-flow: Step 5「公開設定」（公開/限定公開/非公開の3択+共有URL発行+コピー、デフォルト非公開）、イベント編集パネル拡張（レイヤー割当チップ・信憑性3択+補足メモ・出典リスト）
- screens: 年表カードに公開設定モーダル（バッジ「公開中/限定公開/非公開」3種に統一、「下書き」文言廃止）
- `profile.html` 新規: 公開プロフィール @username（explore v3とカバー生成・いいね状態を共有。`?empty=1` で空状態）

## 法務（正: docs/legal/rollout-plan.md）

- Phase 1 は日本向け簡潔版3本（`docs/legal/ja/` terms / privacy / tokushoho）。法務ページ `prototypes/legal.html` は `node docs/legal/build/build-legal.js` で Markdown から再生成
- 決定事項: 登録13歳以上（13〜17歳は保護者同意の表明、Pro購入は18歳以上・日本居住者のみ）/ 非公開・限定公開の年表とAI入力はAI学習に不使用、公開年表はサービス改善に利用可（モデル学習は事前告知+オプトアウト）/ 上限付き責任制限（軽過失¥10,000）/ 法令上必須でない定期義務は負わない / ウェイトリスト無しで即時公開
- 実装時は `docs/legal/implementation-requirements.md`（64要件）を spec-v2-addendum と併読。多法域版は `docs/legal/archive/multi-jurisdiction/`
- 残TODO: 会社情報（登記商号・代表者・番地・電話）、責任上限額の可否、日本の弁護士レビュー

## シードコンテンツ — 全90本完成（2026-08-25）

- `supabase/seed/data/*.json` に90本（explore TITLESの6カテゴリ×15、1,856イベント・うち期間657）。フォーマットは `supabase/seed/CONTENT_SPEC.md`（統合本文2段落・`**強調**`4〜8箇所/本・detail廃止）、生成手順は `supabase/seed/GENERATION_BRIEF.md`
- `node supabase/seed/build-seed.mjs` → `supabase/seed.sql`（Supabase SQL Editorで schema.sql の後に実行。冪等）。紀元前はPostgresの `BC` 日付形式・start_year負数（viewer実装時に「前◯◯年」表示対応が必要）
- レビュー用ページ: `prototypes/seed-review.html`（`node supabase/seed/build-review.mjs` で再生成。カバー写真はexploreのPHOTO_POOLをビルド時抽出）
- 各生成エージェントの「自信の低い箇所」リストはセッション記録にあり。公開前の人手チェック推奨（日付精度・報道ベース数値・未実査URL）

## SEO（正: docs/seo-requirements.md）

- **最大の資産は90本の年表コンテンツ**。「幕末 年表」等の検索にそのまま応えられるページを既に持っている
- **最重要課題はクライアントサイドレンダリング**。現プロトタイプは初期HTMLが「読み込み中…」のみで、90本すべてが空ページ扱いになるリスク → Next.jsでSSG/ISR化が必須（SEO単独でも移行を優先する理由になる）
- **限定公開(`/s/<share_id>`)のnoindexは法務要件でもある**（規約で「限定公開」と説明しているため実装で担保）
- 構造化データは `Article` + `citation`（出典の明示がE-E-A-Tシグナル）。各イベントを `Event` にはしない（誤用リスク）
- 「時代が重なる年表」への内部リンクは、思想とSEOが両立する施策

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
