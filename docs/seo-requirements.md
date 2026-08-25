# Chronos SEO要件（2026-08-26）

## 前提：Chronosの最大のSEO資産は90本の年表コンテンツ

90本 / 1,856イベント、日本語の独自コンテンツで、すべてに出典と信憑性ラベルが付いている。
「幕末 年表」「AI 年表」「半導体 歴史」のような検索に対して、**そのまま答えになるページ**をすでに90枚持っている状態。
検索流入を取れるかどうかは、この資産をクローラに届けられるかで決まる。

---

## 1. 最重要：クライアントサイドレンダリングをやめる（★★★）

**現状のプロトタイプは致命的**。年表本文・タイトル・見出し・出典のすべてを、Supabaseから取得してJSで描画している。
初期HTMLには「読み込み中…」しか入っていない。

- Googlebotはレンダリングするが**第2波・遅延・不確実**。Bing・SNSのクローラ・生成AIのクローラはさらに弱い
- 90本すべてが「中身のないページ」として扱われるリスクがある

**対応**: Next.js(App Router)で **SSG または ISR** にする。年表ページは更新頻度が低いのでSSGが適する。
→ **これはSEO単独でもNext.js移行を優先する十分な理由になる。**

## 2. URL設計（★★★）

| 現在 | 本番 |
|---|---|
| `viewer.html?slug=x` | `/t/<slug>` |
| `profile.html?u=x` | `/@<username>` |
| `explore.html` | `/explore`（フィルタは `?cat=` `?era=` 等） |

- `share_id` 経由の限定公開URLは **`/s/<share_id>` を別系統にし、`noindex`**
- フィルタ違いのURLは**代表URLにcanonicalを向ける**（パラメータの組み合わせで無限に増えるため）

## 3. インデックス制御（★★★・法務要件でもある）

| 対象 | 指定 |
|---|---|
| 公開年表 `/t/<slug>` | index, follow |
| 限定公開 `/s/<share_id>` | **noindex, nofollow**（OGPも出さない） |
| 非公開 | 認証必須（404か403を返す） |
| マイページ・設定・作成フロー | **noindex** |
| 共有環境 chronos.babelinc.workers.dev | 認証必須で401（現状のまま。加えて `X-Robots-Tag: noindex` を返すとより安全） |

**限定公開がインデックスされるのは事故**。利用規約で「限定公開」と説明している以上、実装で担保する。

## 4. 構造化データ（★★・E-E-A-Tに効く）

年表ページに `Article` のJSON-LDを出す。**出典を `citation` として列挙するのが要点**——
「情報源を明示している」という品質シグナルになる。プロトタイプに参照実装あり（`viewer.html`）。

```
@type: Article / headline / description / inLanguage: ja / url / image
author: Person（表示名 + @username）/ publisher: Organization
about: カテゴリ名 / temporalCoverage: "1853/1877"
citation: [{ @type: CreativeWork, name, url }, …]
```

- プロフィールは `ProfilePage` + `Person`
- 全ページに `BreadcrumbList`（ホーム > カテゴリ > 年表）
- トップに `WebSite` + `SearchAction`（サイトリンク検索ボックス）
- **各イベントを `Event` でマークアップしない**。schema.orgの `Event` は開催予定のイベント用で、史実の出来事に使うと誤用・スパム判定のリスク

## 5. 見出しとHTML構造（★★）

- 年表ページの **h1 = 年表タイトル**（プロトタイプで対応済み）
- イベント見出しは h2、年マーカーは意味を持たないので見出しにしない
- explore は h1 =「年表を探す」、カテゴリ見出しを h2 に（**現状 h1 が無い**）
- 期間イベントの `<time datetime>` でマシンリーダブルな日付を出す

## 6. タイトル・ディスクリプション（★★）

- 年表: `{title} — Chronos`（60字以内）。日本語検索では「年表」「歴史」が入っていると強い
- description: `description` の先頭110字。**「◯件のイベントを◯層で」のような数字を入れると CTR が上がる**
- 重複を避ける。カテゴリ一覧ページは必ず固有の文言を持たせる

## 7. 内部リンク（★★）

現在は explore → viewer の一方向だけ。**年表どうしが繋がっていない。**

- 年表ページの下部に「同じカテゴリの年表」「時代が重なる年表」を出す
- **時代が重なる年表へのリンクは Chronos の思想（文脈を重ねる）とも一致し、UXとSEOが両立する数少ない施策**
- オーサーページへのリンク、カテゴリページへのリンク

## 8. サイトマップと robots.txt（★★）

- `/sitemap.xml` を動的生成（90本 + プロフィール36人 + カテゴリ6 + 静的ページ）。`lastmod` に `updated_at` を入れる
- ユーザー生成が増えたら **sitemap index に分割**（1ファイル5万URL上限）
- `/robots.txt`: 管理画面・作成フロー・`/s/` を Disallow、sitemapを明示

## 9. パフォーマンス / Core Web Vitals（★★）

- カバー写真（Unsplash）が LCP 要素になる。**`fetchpriority="high"` と適切な `sizes`**、Next.js の `<Image>` で最適化
- 現状の写真URLは `?w=1080&h=480` 固定。レスポンシブに複数解像度を出す
- フォント4種（Erode / DM Sans / JetBrains Mono / Shippori Mincho）は重い。**`font-display: swap` と subset 化**、可能なら和文フォールバックをシステムフォントに
- 年表ページはイベント20件で本文が長い。**初期表示は折りたたみ（現状のアコーディオン）のままで良いが、HTMLには全文を出す**（クローラは展開しないため）

## 10. 多言語（Phase 3・★）

- `hreflang` を ja / en / de / ko / es / fr / zh-TW で相互参照
- URLは `/ja/t/<slug>` か `ja.chronos.app` か——**サブディレクトリ推奨**（ドメイン評価を分散させない）
- `x-default` を en に

---

## 実装順の推奨

1. **Next.js移行でSSG化**（1〜3を同時に解決）
2. 構造化データ・見出し・内部リンク（4・5・7）
3. sitemap / robots（8）
4. Core Web Vitals（9）
5. 多言語（10・Phase 3）

## プロトタイプで先行実装済み

`viewer.html`: h1 / canonical / JSON-LD(Article + citation) / OGP
`profile.html`: OGP
→ **いずれもJSによる差し替えなので本番では機能しない。Next.js実装の参照仕様として使う。**
