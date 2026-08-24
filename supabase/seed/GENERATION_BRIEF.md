# シードコンテンツ生成ブリーフ（残り72本用・2026-08-25）

あなたはChronos（年表共有サービス）のシードコンテンツ執筆者。割り当てられた各年表について `supabase/seed/data/<slug>.json` を新規作成する。

## 必読（この順で読む）
1. `/Users/shun/chronos/supabase/seed/CONTENT_SPEC.md` — JSONスキーマと品質基準（2026-08-25改定済み。summary統合フォーマット）
2. `/Users/shun/chronos/supabase/seed/data/tech-ai-revolution.json` — 完成形の見本。構成・文体・強調・段落・出典の粒度をこれに合わせる

## 要点（SPECの再確認＋補足）
- **title は指定されたタイトルをそのまま使う**（explore の表示タイトルと一致させるため一字も変えない）
- category は指定された値。language は "ja"
- events は **16〜20件**、年代順。layers は3本（2〜4可）で「重ねると文脈が見える」対比。各レイヤーに最低3件。period イベントを1〜3件
- **summary は統合本文150〜260字・2段落**（`\n\n` 区切り）: 第1段落=出来事そのもの / 第2段落=背景・因果・他レイヤーとのつながり。**detail は常に null**
- **強調**: テーマ（description の視点）を体現するキーフレーズを `**フレーズ**` で囲む。1年表4〜8箇所・1イベント1箇所まで
- credibility 配分の目安 verified 70% / disputed 15% / unverified 15%。disputed/unverified には credibility_note 必須（何が諸説あり・未検証か）
- sources は各イベント1〜2件、実在する出典のみ。URLは確からしいものだけ（不確かなら url: null で title のみ）。**URLをでっち上げない**
- 史実の正確さ最優先。確信がない日付は precision を粗くする。「!」「！」・絵文字禁止。文体は「だ・である」
- personal-life は架空の個人の物語（実在人物の私生活は書かない）。社会レイヤーは史実、個人レイヤーは verified 扱いでよい
- 生存する実在人物は公的行為のみ。私生活・健康・人物評価に踏み込まない

## 作業・検証
- ファイル書き出しは python の `json.dump(..., ensure_ascii=False, indent=2)` を推奨
- 書き出し後に必ず機械検証: json.load 成功 / 全イベント detail=null / `**` が偶数で対応・1イベント1箇所以内 / 「!」「！」なし / 全イベント2段落 / 本文150〜260字（多少の超過は可） / レイヤー色の重複なし / period の end_date >= date / disputed・unverified に note あり
- `build-seed.mjs` / `build-review.mjs` の実行と git 操作は禁止（親側で一括実行する）

## 最終報告に含めること
各ファイルの: イベント数 / 強調箇所数 / **自信の低い箇所**（日付・数値・URL・固有名詞で確認できなかったもの）を必ず列挙
