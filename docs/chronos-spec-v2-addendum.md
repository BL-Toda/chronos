# Chronos 仕様補遺 v2（2026-07-31 決定反映）

chronos-decisions-draft-20260731.md の全項目（★推奨案）確定を受けた、DB・API仕様の差分定義。
docx原本（prelaunch-package / api-design / spec-update-layers）は v1 参照として残し、**実装時は本補遺が優先**。
Next.js + Supabase + Cloudflare での再実装（決定済み方針)の入力ドキュメントとして使う。

---

## 1. DBスキーマ v2 差分

### events（改訂）
```sql
ALTER TABLE events
  ADD COLUMN end_date DATE NULL,                -- 期間イベントの終了日（点イベントはNULL）
  ADD COLUMN event_type TEXT NOT NULL DEFAULT 'point'
    CHECK (event_type IN ('point','period')),
  ADD COLUMN summary TEXT NOT NULL DEFAULT '',  -- 一覧・カード用の短文
  RENAME COLUMN description TO detail;          -- 展開時の本文（NULL可に変更）
-- 制約: event_type='period' のとき end_date IS NOT NULL AND end_date >= event_date
```
- 信憑性は既存定義を継続: `credibility CHECK ('verified','disputed','unverified')` + `credibility_note`
- 出典は既存 `event_sources(url, title)` を継続
- **編集UIは信憑性・出典・レイヤー割当の入力を必須で持つ**（現行プロトタイプに欠落 → 実装時に追加）

### timelines（改訂）
```sql
ALTER TABLE timelines
  ADD COLUMN language TEXT NOT NULL DEFAULT 'ja',  -- explore言語フィルタ用
  ADD COLUMN start_year INT NULL,                  -- 年代フィルタ用キャッシュ
  ADD COLUMN end_year INT NULL,                    --（イベント登録/削除時に再計算）
  ADD COLUMN bookmark_count INT NOT NULL DEFAULT 0,
  ADD COLUMN cover_seed TEXT NULL,                 -- 生成型フォールバックカバーのシード
  ADD COLUMN cover_photo_id TEXT NULL,             -- Unsplash写真ID（カバーの正。2026-08-19確定）
  ADD COLUMN cover_url TEXT NULL,                  -- images.unsplash.com の raw URL（?以降除去。表示時にサイズ付与）
  ADD COLUMN cover_credit JSONB NULL;              -- {name, user_link, photo_link, download_location}
```
- **カバー画像（Unsplash）**: 年表作成時にタイトル・カテゴリから自動提案（サーバー側で Unsplash API `search/photos` を実行、Access Keyはサーバー秘匿）し、ユーザーが選択または再検索。採用時に `download_location` を叩く（Unsplash API規約）。表示は `cover_url?w=..&h=..&fit=crop&auto=format` を直接参照（再ホスト不可）、カード/ビューアに撮影者クレジット（utm_source=chronos）。写真未選択・読み込み失敗時は `cover_seed` の生成型SVGにフォールバック
- visibility は既存3値（public / unlisted / private）のまま。**「下書き」ステータスは追加しない**（非公開=下書き扱い、UIバッジは「公開中/限定公開/非公開」）

### bookmarks（新設）
```sql
CREATE TABLE bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, timeline_id)
);
-- RLS: 本人のみ INSERT/DELETE/SELECT。timelines.bookmark_count をトリガまたはAPI側で更新
```

### reports（新設・通報MVP）
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE,
  reporter_id UUID NULL REFERENCES users(id),  -- 未ログイン通報も許容するならNULL可
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 運用: 通報→運営へメール通知→手動で visibility='private' に変更。admin画面はMVPでは作らない
```

### その他
- layers.name は **最大30字** に統一（60字定義を改訂。入力欄に maxlength=30）
- users: 実名カラムは追加しない（表示名+username のみ）
- notifications.type は `('like','system')` のまま（コメント・週間レポートはスコープ外）

## 2. API v2 差分

### events系
- `POST /api/timelines/:id/events` / `PATCH /api/events/:id` / `POST /api/timelines/:id/events/bulk`:
  リクエスト/レスポンスに `end_date` `event_type` `summary` `detail` `credibility` `credibility_note` `sources[]` `layer_id` を含める
- AI生成出力スキーマも同項目に追従（期間イベントを生成可能にする）

### explore系
- `GET /api/timelines` にクエリ追加: `year_from` `year_to` `min_layers` `min_events` `language` `sort=popular|new|events`。`q` はタイトル+説明+カテゴリを対象に拡張
- カテゴリマスタは6種で確定: `technology / history-politics / culture / science-nature / business / personal-life`（表示名: テクノロジー / 歴史・政治 / カルチャー / 科学・自然 / ビジネス / 個人・ライフ。カテゴリカラーはexplore実装値を正とする）

### ソーシャル
- `POST /api/timelines/:id/like` / `DELETE 同`（既存定義を実装。viewer・exploreの両方から呼ぶ）
- `POST /api/timelines/:id/bookmark` / `DELETE 同`（新設）
- `POST /api/timelines/:id/report`（新設・通報MVP）

### 公開・共有
- `PATCH /api/timelines/:id` の visibility 変更+`share_id` 発行は既存定義を実装（UIは作成フロー最終ステップ+設定モーダル。デフォルト非公開）
- `GET /api/covers/suggest?timeline_id=`（Unsplash検索の代理。サーバー側キー）/ `POST /api/timelines/:id/cover`（photo_id 確定・download_location 通知）
- `GET /embed/:share_id`（iframe配信）、`GET /api/timelines/:id/export?format=jpeg|png`（Free=JPEG+透かし / Pro=PNG高解像度。プラン制限はサーバー側でenforce）を新設
- OGP画像生成はSatori互換の表現に限定する（blur・text-shadow不使用）。イベント年を取得してミニ年表を描画

### 課金（Stripe）
- `POST /api/billing/checkout`（Checkoutセッション作成）
- `POST /api/billing/webhook`（subscription作成/更新/解約の反映）
- `POST /api/billing/portal`（顧客ポータル: プラン管理・解約）

### 認証
- **Google/Apple OAuthのみ**（Supabase Auth）。マジックリンクは採用しない（auth画面からメールフォームを撤去）
- 初回ログイン後に `/api/users/setup`（username設定）へ誘導する画面を新設

### サポート
- 問い合わせフォームは廃止し `contact@chronos.tech` メールリンクに簡素化（/api/support は作らない）

## 3. プラン正本（spec-update-layers を正とし本補遺で確定）

| | Free | Pro |
|---|---|---|
| AI生成 | 月3回 | 無制限 |
| AI Edit Assist | 月10回 | 無制限 |
| 年表数 | 2 | 無制限 |
| 書き出し | JPEG（透かし） | PNG高解像度 |
| 埋め込み | — | ○ |
| 価格 | ¥0 | ¥800/月・¥6,800/年（表記は「月あたり¥567」方式。「◯ヶ月分お得」は使わない） |

- AI機能の呼称は「**下書き**」に統一

## 4. 画面インベントリへの影響（実装時に新設が必要なUI）

1. 公開設定ステップ/モーダル（3択+share_id発行）— 作成フロー末尾+年表設定
2. イベント編集パネルの拡張（信憑性・出典・レイヤー割当・期間トグル+終了日）
3. viewerのいいねボタン / exploreの♡🔖トグル
4. マイページのブックマークタブ（Explore v3）+ Assist使用量バー
5. 公開プロフィール `/@username`（公開年表一覧のみのMVP。マイページ=私的ダッシュボードと分離）
6. username初回設定画面
7. 年表削除+確認モーダル、通報ボタン
8. 空状態・エラー状態（AI生成失敗+再試行、authエラー、一覧0件）

### 法務要件由来のUI（docs/legal/implementation-requirements.md 参照、2026-08-17 追加）
9. 初回セットアップ画面: 年齢帯選択（18歳以上 / 13〜17歳 / 13歳未満=登録不可）、13〜17歳は保護者同意チェック必須、居住国選択（IP推定を初期値）、規約・プライバシーポリシーへの同意チェック（版・日時を記録）
10. 設定画面: 「18歳以上になりました」自己申告切替（未成年→成人、逆不可）、公開年表のAI学習利用オプトアウトトグル（既定OFF=許可、事前告知後に有効化）、機能案内メールの受信設定（オプトイン）、分析Cookie（GA4）同意の変更、データ書き出し（JSON+画像）、アカウント削除（Pro同時解約の注意）
11. 未成年ユーザーの初回公開時: 個人情報（本名・学校名・住所）掲載の注意モーダル+確認チェック
12. Pro購入導線: 未成年・日本国外は非表示、決済前の最終確認画面（特商法12条の6: 内容・価格・支払時期・自動更新条件・解約方法・返金不可+規約/特商法表記リンク）
13. 分析Cookie同意バナー（同意/同意しない、同意まで GA4 不発火。埋め込み iframe には出さない）
14. 公開画面のAI下書き・未検証バッジ（未検証のAI由来イベントに常時表示）
15. 通報フォーム2種（規約違反=匿名可 / 権利侵害=氏名・連絡先・URL・説明必須）+運営用の最小管理画面（一覧・非公開化・削除・メモ）
16. 法務ページ（利用規約 / プライバシーポリシー / 特商法表記）と各画面フッターからの導線
