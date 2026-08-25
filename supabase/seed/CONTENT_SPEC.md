# Chronos シードコンテンツ仕様（生成エージェント向け）

出力先: `supabase/seed/data/<slug>.json`（1年表=1ファイル、UTF-8）。この JSON は `supabase/seed/build-seed.mjs` が `seed.sql` に変換する。

## JSONスキーマ（厳守）
```json
{
  "slug": "tech-ai-revolution",           // 英小文字・数字・ハイフン。<category-short>-<topic>
  "title": "AI革命の全体像 2020–2026",      // explore の TITLES と一致させる（与えられたタイトルをそのまま）
  "description": "…",                     // 60〜120字。年表の視点と価値を一文〜二文で
  "category": "technology",              // technology | history-politics | culture | science-nature | business | personal-life
  "language": "ja",
  "start_year": 2012, "end_year": 2026,   // イベントの最古/最新年
  "layers": [                              // 3本（2〜4可）。「重ねると文脈が見える」対比になる切り口を選ぶ
    {"name": "技術", "color": "blue"},     // name ≤ 30字。color: blue|green|pink|gold|purple|teal|orange（1年表内で重複不可）
    {"name": "企業と資本", "color": "orange"},
    {"name": "社会と規制", "color": "teal"}
  ],
  "events": [                              // 14〜20件。年代順。各レイヤーに最低3件
    {
      "date": "2017-06-12",               // ISO。月日不明なら "2017-06-01"/"2017-01-01" と precision で示す
      "precision": "day",                 // year | month | day
      "end_date": null,                    // 期間イベントのみ（type=period で必須、date以降）
      "type": "point",                     // point | period（1年表に1〜3件は period を入れる）
      "layer": "技術",                     // layers[].name のいずれか
      "title": "Transformer論文「Attention Is All You Need」公開",  // ≤ 40字
      "summary": "…",                     // 統合本文150〜260字（2026-08-25改定・下記「本文フォーマット」参照）
      "detail": null,                      // 使用しない（常にnull。旧2階層フォーマットは廃止）
      "credibility": "verified",          // verified | disputed | unverified（配分の目安: 70% / 15% / 15%）
      "credibility_note": null,            // disputed/unverified のとき必須: 何が諸説あり・未検証なのか一文
      "sources": [                         // 1〜2件。実在する出典。URLは確からしいものだけ（不確かなら url: null で title のみ）
        {"title": "arXiv: Attention Is All You Need (1706.03762)", "url": "https://arxiv.org/abs/1706.03762"}
      ]
    }
  ]
}
```

## 本文フォーマット（summary。2026-08-25改定、見本: tech-ai-revolution.json）

- 旧「summary+detail」2階層を廃止し、1本の統合本文を `summary` に入れる（`detail` は常にnull）
- 長さ150〜260字。**2段落構成**（段落区切りは `\n\n`）: 第1段落=出来事そのもの / 第2段落=背景・因果・他レイヤーとのつながり
- **強調**: 年表のテーマ（descriptionの視点）に直結するキーフレーズを `**フレーズ**` で囲む。1年表20イベント中4〜8箇所・1イベント1箇所まで。劇的な事実ではなく「この年表が何を見せたいか」を体現する句だけに付ける
- credibility_note と重なる留保表現（「報道ベース」等）は本文からも落とさない

## 期間イベントの設計指針（2026-08-25追加・見本: personal-moving-history.json）

**期間の線の重なりこそがChronosの中核体験。**「点で書けるか」ではなく「本当は期間ではないか」を常に疑う。

- **状態・在籍・継続は期間にする**: 住んでいた家、勤めていた会社、続いた好況・戦争・流行、連載・在位・稼働期間など。「始まった日」を点で書きたくなったら、それは大抵「終わりのある期間」
- **重なりを設計する**: レイヤーの異なる期間同士が重なる場所に、その年表の発見を置く（例:「バブルの線が途切れる最後の月に家を買った」「持ち家の線の上に単身赴任の線が並走する」）。本文でも重なりに言及する
- 分量の目安: **1年表に期間4〜12件**。同一レイヤーの連続する状態（住まいの遍歴など）は途切れない1本の線として続くように端点を接続する
- 進行中の期間は end_date を生成時点の年月でキャップし、本文で「現在も続く」ことを示す
- 期間の境界に諸説がある場合（時代区分など）は credibility=disputed + note で採用基準を明示する
- viewer は重ならない期間に同じレーン列を再利用し、同一レイヤーの線は同じ列に続く（列数は同時に重なる最大数だけ）

## 品質基準
- **史実の正確さ最優先**。確信がない日付・数値は precision を粗くするか credibility を `unverified`/`disputed` にして note に理由を書く（Chronosの思想: 分からないことは分からないと表示する）
- 年代の前後関係・因果関係に矛盾がないこと（例: 発売前に普及率が上がらない）
- **レイヤーは「重ねると発見がある」対比**にする（技術×資本×規制、作品×制度×受容、個人×社会 など）。detail の中で「同じ年に別レイヤーで何が起きていたか」に最低5件は触れる
- 固有名詞・数値には出典。Wikipedia でも可だが、可能なら一次資料（公式発表、論文、政府統計、報道）
- personal-life カテゴリは**架空の個人の物語**でよい（実在人物の私生活は書かない）。ただし社会レイヤー（時代の出来事）は史実に基づき、個人レイヤーは架空と分かるトーンで。credibility は個人レイヤー=verified扱いでよい（本人記録という建付け）
- 生存する実在人物について、私生活・健康・評価に踏み込む記述はしない。公人の公的行為のみ
- 文体: 「だ・である」/体言止め、簡潔。「!」不使用、絵文字不使用
- 日本語。固有名詞は一般的な表記（原語併記は初出のみ可）
