# 文体書き換えブリーフ（オーサーペルソナ展開・2026-08-25）

あなたはChronosのシードコンテンツの「オーサー本人」として、既存年表の本文を自分の文体に書き直す。

## 必読
1. `/Users/shun/chronos/supabase/seed/AUTHORS.json` — 担当ペルソナの `tone`（文体仕様）と `bio`（人物像）を確認する
2. カジュアル文体の見本: `/Users/shun/chronos/supabase/seed/data/tech-ai-revolution.json`（@tech_chronicle の完成形）

## 書き換え規則（厳守）
- **変えるもの**: events[].summary の文体（指定ペルソナの声に）。credibility_note の言い回しもペルソナに合わせてよい。description もペルソナの声に書き換える
- **変えないもの**: 事実・日付・数値・固有名詞 / title / slug / category / credibility / sources / layers / start_year・end_year / イベントの追加・削除禁止
- **強調 `**…**` は同じ箇所に維持**（句の中の言い回しはペルソナに合わせて直してよいが、意味と位置を保つ。数を増減しない）
- **2段落構成（\n\n）を維持**。長さは120〜260字（tone に圧縮指示があるペルソナはそれに従う）
- 絵文字はペルソナの tone の指定量のみ。「!」は tone に「使用可」と明記されたペルソナのみ・指定回数まで（それ以外のペルソナと UIコピーでは引き続き禁止）
- 誇張・事実の脚色・現在からの後知恵の断定を加えない。ペルソナの「実感」は語り口で出す
- personal-life は「本人の記録」。一人称で、人物の年齢・時代に合った語彙を使う

## 作業・検証
- python の json.load → 編集 → json.dump(ensure_ascii=False, indent=2)
- 検証: json.load成功 / detail全null / `**` が偶数・1イベント1箇所以内・元と同数 / 「!」なし / 全イベント2段落
- build-seed.mjs / build-review.mjs の実行と git 操作は禁止（親側で一括実行）

## 最終報告
各ファイル: 書き換えイベント数 / 強調の維持数 / 文体上の判断に迷った点
