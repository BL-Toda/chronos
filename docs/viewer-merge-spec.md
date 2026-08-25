# viewer 統合仕様（2026-08-25決定）

seed-review と viewer に分かれていた「年表詳細」を **viewer 1枚に統合**する。

## 役割の再定義

| ファイル | 統合後の役割 |
|---|---|
| `chronos-viewer.html` | **年表詳細の唯一の正**。Supabase から `?slug=` で読む。閲覧・作成者ビューともここに集約 |
| `chronos-seed-review.html` | **90本のインデックス専用**（JSON生成）。カードから `chronos-viewer.html?slug=` へ送る。詳細ビューは持たない。DB投入前のコンテンツ確認用に維持 |
| `chronos-explore.html` | 公開フィード（DB）。カードから viewer へ |
| `chronos-profile.html` | 公開プロフィール（@username）。カードから viewer へ |

## viewer に移植するもの（seed-review 由来）

1. **カバー写真ヒーロー** — Unsplash 写真（PHOTO_POOL をビルド時ではなく viewer 内に持つ／explore と同じ seed 決定論）、下部グラデーション、画像下に小さな撮影者クレジット（utm 付き）
2. **ヘッダー情報** — 絵文字入りタイトル、カテゴリラベル、説明文、`@username`（DBの users から）、統計行（期間・イベント数・検証済み／諸説あり／未検証の内訳）
3. **本文表示** — 2段落レンダリング、`**強調**`（白文字・太字）、信憑性バッジ（モノトーン3段）、`（諸説ありの理由）`ラベル付き補足メモ、出典リスト
4. **アコーディオン** — 円形の枠に小さなシェブロン、カード全体がタップ領域、開閉ともモノトーン、`すべて開く/すべて閉じる`
5. **読み進み** — ヘッダー下の読了インジケーター、スクロールでコンパクトになるヘッダー、現在年のフローティング表示
6. **デザイン基盤** — `docs/design-system-2026-08.md`（5段タイプスケール・モノトーン・4px余白・hover:hover ホバー）

## viewer に残すもの（viewer 固有）

- 期間イベントのレーン表示（左のカラーバー）、軸のドット、期間の開始／終了マーカー、点線コネクタ
- レイヤーチップによる**表示/非表示の切替**（seed-review の減光ではなくこちらを採用）
- レーンクリックでの期間ハイライト（該当行以外を減光）
- いいね（localStorage `chronos_likes_v1`）、共有シート、CTA フッター

## 実装メモ

- カバー写真は explore の `PHOTO_POOL` を正とし、viewer にも同じ選択ロジック（`hashStr(catKey + '|' + title)`）を持たせる。**タイトルに絵文字が入ったため、explore と同じハッシュ入力になるよう DB の title をそのまま使う**
- 統計の内訳は取得済み events から集計（追加リクエスト不要）
- 紀元前（`0044-03-15 BC`）表示は現行の `parseDate` / `yearLabel` を維持
- seed-review は詳細ビュー（`#slug` ルーティング）を削除し、カードを `<a href="chronos-viewer.html?slug=...">` に変更
