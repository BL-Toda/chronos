# Chronos UIデザインルール（2026-08-25確定・prototypes/seed-review.html が実装の見本）

レビューページで確定したルール。explore / viewer / profile など全画面に展開する。

## 1. カラー

```css
--bg:#0A0A0C; --bg2:#0E0E11; --card:#16161A;
--text-h:#F5F2ED;   /* 見出し・強調 */
--text:#E8E4DE;     /* 本文 */
--text2:#9A9590;    /* 副情報・説明 */
--text3:#7A7570;    /* メタ・出典 */
--accent:#B8B4AE;           /* ラベル用の明るいグレー（旧ゴールド #C8A87E は廃止） */
--accent-soft:rgba(232,228,222,0.07);
--accent-med:rgba(232,228,222,0.14);
--border:rgba(232,228,222,0.09);
--border2:rgba(232,228,222,0.18);
```

- **クローム（枠線・ラベル・日付・アイコン・進捗バー・フォーカスリング）はすべてモノトーン**。ゴールド／オレンジの装飾色は使わない
- **彩度を持つのはレイヤーカラー7色だけ**（Blue #5B9BD5 / Green #7BC67E / Pink #D4849A / Gold #C8B87E / Purple #9E7EC8 / Teal #5BBCB4 / Orange #D4A05A）。カテゴリ色・レイヤードット・チップ・イベントカードの左バーなど、データを指す要素にのみ使う
- 色のヒエラルキーは text-h → text → text2 → text3 の4段で作る

## 2. タイプスケール（5段のみ。px直書き禁止・トークン参照）

```css
--fs-display:clamp(24px,4vw,32px); --lh-display:44px;  /* ページ・年表タイトル */
--fs-title:18px;   --lh-title:28px;   /* カード見出し・イベント見出し・セクション名 */
--fs-body:15px;    --lh-body:28px;    /* 本文・リード・説明文 */
--fs-sm:13px;      --lh-sm:22px;      /* 日付・カード説明・補足・チップ・ボタン */
--fs-xs:11px;      --lh-xs:18px;      /* バッジ・出典・統計・ラベル・件数 */
```

- 行間は必ず**偶数px の固定値**（1.5 等の倍率指定は使わない）
- ウェイトは **400 / 500 / 700 の3種のみ**。Regular=本文・説明、Medium=見出し・日付・ラベル・選択中の要素、Bold=強調語と統計の数値
- フォント: 見出し `Erode`（和文フォールバック Shippori Mincho）/ 本文 `DM Sans` / データ・ラベル `JetBrains Mono`
- **年月の数字は DM Sans + `font-variant-numeric:tabular-nums`**（monoにしない）。イベント数・統計などのデータ系は JetBrains Mono

## 3. 余白

- **すべての padding / margin / gap は4の倍数**（4,8,12,16,20,24,28,32,40,48,64,76,84…）
- カード内側 24〜28px、カード間 20〜24px、セクション間 64〜84px を目安に、全体をゆったり取る

## 4. インタラクション

- ホバーは `@media (hover:hover) and (pointer:fine)` の中だけに書く（タッチ端末で状態が残らないように）
- ホバーの表現: 枠線を `--border2` へ / 背景をわずかに明るく / 見出しを `#FFFFFF` へ / カードは `translateY(-3px)` と影 / 色ドットは `scale(1.15)` / リンクは文字色と下線を明るく
- タップ時は `:active` で背景を一段明るく（`#1A1A1F`〜`#1E1E24`）。`-webkit-tap-highlight-color:rgba(232,228,222,0.06)`、`touch-action:manipulation`
- トランジションは 0.2〜0.35s、イージングは `cubic-bezier(0.16,1,0.3,1)`
- アコーディオン等の開閉状態もモノトーンで表現（円形ボタンの枠と背景を白系の透明度で変化）
- すべてのモーションは `@media (prefers-reduced-motion:reduce)` で無効化する

## 5. アクセシビリティ

- **ズームを禁止しない**。`<meta viewport>` に `user-scalable=no` / `maximum-scale` を入れない（WCAG 1.4.4）。指定は `width=device-width, initial-scale=1.0, viewport-fit=cover`
- iOSはフォントが16px未満の入力欄にフォーカスすると自動でズームするため、**タッチ環境でだけ入力欄を16pxにする**。`--fs-input:16px` / `--lh-input:24px` はこの用途専用のトークン:
  ```css
  @media (pointer:coarse){
    input,textarea,select{font-size:var(--fs-input) !important;line-height:var(--lh-input) !important}
  }
  ```
- `:focus-visible` はホバー用メディアクエリの外に置き、キーボード操作を常に有効にする（枠は `2px solid var(--text-h)`）

## 6. その他

- コピーに「!」は使わない（UIコピーのルール。シードコンテンツ側はペルソナ許可制で例外あり）
- ヘッダーは高さ100px・ロゴ高さ40px。スクロール時に60px／24pxへ縮むコンパクトヘッダーを推奨
