# Chronos 法務要件仕様書（実装要件）v1 — 2026-08-17

法務文書（利用規約・プライバシーポリシー・特商法表記・コンテンツポリシー）が要求する挙動を、実装チームがそのまま着手できる要件として1本にまとめたもの。
**docs/chronos-spec-v2-addendum.md（仕様補遺 v2）の追補**として機能し、本書と補遺が矛盾する場合は本書を優先する（法務要件が実装仕様に先行するため）。

- 段階戦略の正: docs/legal/rollout-plan.md（Phase 1 = 日本+英語版、Pro課金は日本居住者のみ / Phase 2 = 米国・英語圏へのPro開放 / Phase 3 = EU・韓国・台湾）
- 所見の出所: docs/legal/ja/review-20260817.md（以下「レビュー」。所見番号を「所見N」と表記）
- 法務文書の条番号: 「規約N条」= docs/legal/ja/terms.md、「PP N節」= docs/legal/ja/privacy.md、「特商法表記」= docs/legal/ja/tokushoho.md、「CP」= 新設予定の「コンテンツポリシーおよび通知・措置の手続」
- 本書は法的助言ではない。各法域の弁護士確認により値・文言が変わる箇所は `[要弁護士確認]` と記す

## 0. 読み方

| 項目 | 意味 |
|---|---|
| ID | `R-xx`。他文書・チケット・PRから参照する。欠番は作らず、廃止時は「廃止」と明記して残す |
| Phase | 1 = ローンチまでに必須 / 2 = 米国・英語圏Pro開放までに必須 / 3 = EU・韓国・台湾開放までに必須。「1→3」は Phase 1 で最小実装し Phase 3 で拡張 |
| 根拠 | 法令条文・法務文書の条番号・レビュー所見番号 |
| 受入基準 | QA/レビューで確認できる観測可能な条件。すべて満たして初めて完了 |

Phase 1 の要件はローンチのブロッカーであり、未実装のまま公開しない。Phase 2/3 の要件は「予約」として設計上の余地（テーブル・画面枠）だけを Phase 1 で確保する。

---

## 1. 居住国データモデル

付則の適用・課金可否・税・撤回権・自動更新ルールの分岐はすべて居住国に依存する（レビュー「構造的にやり直すべき点1」、所見3・17）。「申告した居住国」と「決済時の請求先国」を分けて持ち、決済に関する判定は後者を正とする。

### R-01 users.country（申告居住国）

| ID | Phase | 根拠 |
|---|---|---|
| R-01 | 1 | rollout「居住国の取得」/ 規約 付則総則 / PP 3節（取得項目に「居住国（申告/推定）」を追加）/ 所見3 |

要件
- `users.country CHAR(2)`（ISO 3166-1 alpha-2、大文字）を追加。NULL 不可（登録完了時に必ず確定）。
- `users.country_source TEXT CHECK (country_source IN ('ip','declared','billing'))` と `users.country_updated_at TIMESTAMPTZ` を併設し、値の由来と最終更新時刻を保持する。
- 変更履歴は `user_country_history(user_id, country, source, changed_at)` に追記する（付則の適用判定を後から説明できるようにするため）。

受入基準
- 登録完了直後の users 行に country / country_source / country_updated_at がすべて非NULLで入っている。
- 国コードは ISO 3166-1 alpha-2 の妥当なコードのみ受け付け、それ以外は 400 で拒否される。
- 国を変更すると history に1行追加され、users.country_source が `declared` に更新される。

### R-02 IP推定初期値とユーザーによる訂正

| ID | Phase | 根拠 |
|---|---|---|
| R-02 | 1 | rollout「居住国の取得」/ 所見3 修正案(b) |

要件
- 登録画面の国選択の初期値は Cloudflare のリクエストヘッダ（`CF-IPCountry`）から推定する。推定不能（`XX`/`T1`）の場合は未選択とし、必ずユーザーに選ばせる。
- ユーザーは登録時および設定画面「アカウント > 居住国」でいつでも変更できる。変更に上限回数は設けないが、Pro契約中の変更は R-05 の再判定を伴う。
- 推定値をそのまま確定した場合も country_source は `ip` ではなく、ユーザーが選択を確定した事実をもって `declared` とする（IP推定は初期値に過ぎない）。UI上「あなたの居住国を選択してください（推定: 日本）」のように推定である旨を表示する。

受入基準
- `CF-IPCountry: JP` でアクセスした登録画面の国セレクトが「日本」に初期化されている。
- ヘッダが `XX` のとき国セレクトが未選択で、未選択のままでは登録を完了できない。
- 設定画面から国を変更でき、変更後の値が API と DB に反映される。

### R-03 users.billing_country（決済時の請求先国）

| ID | Phase | 根拠 |
|---|---|---|
| R-03 | 1 | rollout「決済時はStripe請求先国を正とする」/ 所見3 修正案(a)・所見17 |

要件
- `users.billing_country CHAR(2) NULL` を追加。Stripe Checkout 完了時（`checkout.session.completed`）の `customer_details.address.country` を保存し、`customer.updated` で請求先が変わった場合も追随する。
- 決済に関する法的判定（課金可否・税・撤回権・自動更新ルール・最終確認画面の様式）は `billing_country` を正とし、`country` はFree利用者向けの付則適用・表示言語の初期値・統計に用いる。
- `billing_country` と `country` が異なる場合は不整合を隠さず、設定画面に「請求先国: JP / 申告居住国: US」のように両方を表示し、規約 付則総則の「申告と実際が異なる場合でも強行法規の保護は失われない」旨のリンクを添える。

受入基準
- Checkout 完了 webhook 処理後に users.billing_country が Stripe の請求先国と一致する。
- Stripe 側で請求先住所を変更すると webhook 経由で billing_country が更新される。
- billing_country が NULL のユーザー（未課金）に対して課金系の判定関数が呼ばれた場合、`country` にフォールバックせず「未決済」として扱う。

### R-04 判定ロジック（付則・課金可否・税）

| ID | Phase | 根拠 |
|---|---|---|
| R-04 | 1→3 | rollout Phase 1「Pro課金は日本居住者のみ」/ 規約 付則総則・付則A〜D / 所見3・17 |

要件
- サーバー側に単一の判定モジュール `legal/jurisdiction.ts` を置き、以下を純関数で返す。UIもAPIもこの関数のみを参照する（判定の分散を禁止）。

| 関数 | 入力 | 出力（Phase 1 の値） |
|---|---|---|
| `getAnnex(country)` | users.country | `'common'`（Phase 1 は全員共通本文。US は `'D'`= CalOPPA最小構成、EU/KR/TW は Phase 3 で `'A'/'B'/'C'`） |
| `canPurchasePro(billingCountryCandidate)` | 登録国 or 請求先国 | Phase 1: `country === 'JP'` のみ true。Phase 2 で US/GB/CA/AU 等を追加、Phase 3 で EU/KR/TW |
| `getTaxMode(billingCountry)` | 請求先国 | Phase 1: `'jp_inclusive'`（消費税内税、¥800/¥6,800 税込表示）。Phase 2 以降 Stripe Tax 有効化 |
| `getCheckoutDisclosure(billingCountry)` | 請求先国 | Phase 1: `'jp_tokushoho_12_6'`（R-14）。Phase 2: `'us_ca_arl'`、Phase 3: `'eu_withdrawal'` 等 |
| `getRenewalRule(billingCountry)` | 請求先国 | Phase 1: 月額=1ヶ月・年額=12ヶ月自動更新。Phase 3 EU: 年額は初回期間後「月単位・1ヶ月予告解約可」に切替（所見5） |
| `getMinPurchaseAge(country)` | 居住国 | 既定 18。国別の成年年齢テーブルで上書き `[要弁護士確認]` |

- 国リストはコード内定数ではなく `legal_country_rules` テーブル（country, can_purchase, tax_mode, disclosure, renewal_rule, annex, min_purchase_age, updated_at）で管理し、Phase 移行時にデプロイなしで開放できるようにする。

受入基準
- `canPurchasePro('JP') === true`、`canPurchasePro('US') === false`（Phase 1 の設定値）がユニットテストで固定されている。
- `legal_country_rules` の行を更新すると、再デプロイなしに `/api/billing/checkout` の可否判定が変わる。
- 判定関数の呼び出し箇所を grep して、UI/API に国コードの直接比較（例 `country === 'JP'`）が残っていない。

### R-05 居住国・請求先国の変更時の再判定

| ID | Phase | 根拠 |
|---|---|---|
| R-05 | 1 | 規約 付則総則 / 所見3 |

要件
- `users.country` の変更時: 付則の表示・通知テンプレートの言語候補・年齢要件を再計算する。Pro契約中に「課金不可の国」へ変更しても既存契約は即時停止しない（強行法規保護の観点で不利益にしない）が、次回更新前に「請求先国の確認」メールを送り、Stripe 上の請求先国が課金不可国に変わっていた場合のみ R-12 の後段処理を行う。
- `users.billing_country` の変更時（Stripe webhook）: `canPurchasePro` を再評価し、false になった場合は R-12 の「課金不可国への変更」フローを実行する。
- 再判定結果はすべて `user_country_history` に理由付きで残す。

受入基準
- Pro契約中のユーザーが設定で国を US に変更しても、subscription は active のまま変わらず、確認メールがキューに積まれる。
- Stripe 上の請求先を JP 以外に変更した webhook を模擬すると、R-12 後段の処理（次回更新停止・通知）が実行される。

### R-06 プライバシーポリシー上の取得項目・利用目的との整合

| ID | Phase | 根拠 |
|---|---|---|
| R-06 | 1 | PP 3節・4節 / 所見3 修正案 |

要件
- PP 3節に「居住国（申告または推定）」「請求先国（決済時にStripeから取得）」を取得項目として追加し、利用目的（付則の適用判定・課金可否・税・法令遵守）を4節に追加する。本要件はドキュメント側の作業だが、実装の完了条件として PP の該当箇所が公開版に反映されていることを含める。
- CF-IPCountry の値そのものは保存せず、推定国コードのみを初期値として使う（IPアドレスの保存は PP 10節のアクセスログ規律に従う）。

受入基準
- 公開中の PP に上記2項目と目的が記載されている。
- users テーブルにIPアドレス列が存在しない。

---

## 2. 登録フロー

### R-07 年齢確認（16歳以上）

| ID | Phase | 根拠 |
|---|---|---|
| R-07 | 1 | 規約2条 / PP 2.2・13節 / rollout「登録16歳以上」/ 所見14 |

要件
- OAuth 完了後・username 設定前の初回セットアップ画面（補遺 §2「/api/users/setup」）に「私は16歳以上です」チェックボックスを置く。既定は未チェック。生年月日は取得しない（データ最小化）。
- チェック時刻を `users.age_confirmed_at TIMESTAMPTZ` に保存し、`consents` にも `doc_type='age_16'` として記録する（R-09）。
- 未チェックでは登録を完了できず、「16歳未満の方はご利用いただけません」の案内と、作成途中の auth ユーザーの削除導線（登録取消）を出す。
- 16歳未満と後日判明した場合の運用（規約11条1項「虚偽申告」による削除）は管理画面（R-40）から実行できること。

受入基準
- チェックなしで setup API を叩くと 422 が返り、users 行が作成されない。
- チェックありで登録すると age_confirmed_at と consents 行が生成される。

### R-08 国選択

| ID | Phase | 根拠 |
|---|---|---|
| R-08 | 1 | R-01・R-02 / 所見3 |

要件
- 同じセットアップ画面に国セレクト（R-02 の初期値ロジック）を置く。表示は現地語名+英語名（例「日本 / Japan」）。
- 選択した国に応じて、同意対象文書の付則の説明文（Phase 1: US のみ付則D、その他は共通本文）を同意ブロックの直下に表示する。

受入基準
- 国未選択で setup API を叩くと 422。
- US を選択すると付則Dの案内文が表示され、JP では表示されない。

### R-09 規約・ポリシーへの同意記録（consents テーブル）

| ID | Phase | 根拠 |
|---|---|---|
| R-09 | 1 | 民法548条の2（定型約款の合意）/ GDPR Art.7(1)（同意の立証）/ 規約1条・12条 / PP 14節 |

要件
- `consents` テーブルを新設する（DDL は §12）。1レコード=1文書1バージョンへの1回の同意。
  - `doc_type`: `terms | privacy | content_policy | cookie_analytics | marketing_email | age_16 | adult_18 | ai_training_change`（将来の方針変更用）
  - `doc_version`（`legal_document_versions.version` を参照）、`language`（同意時に表示していた版の言語）、`accepted_at`、`revoked_at`、`method`（`signup | reconsent | settings | checkout | banner`）、`user_agent`、`ip_hash`（ソルト付きハッシュ、生IPは保存しない）
- 登録時は terms / privacy / content_policy への同意を1つのチェックボックスで取得してよいが、それぞれ独立した consents 行として保存する（文書ごとにバージョンが進むため）。文書名は個別リンクにする。
- 「同意する」を押す前に、各文書の全文がアプリ内で閲覧できる（外部遷移でも可だが新規タブ）。
- 規約12条の改定時、効力発生日以降の初回ログインで再同意画面を出し `method='reconsent'` で記録する（R-59）。

受入基準
- 登録完了後に consents に terms/privacy/content_policy/age_16 の4行が同一 accepted_at で存在し、doc_version が公開中の最新版と一致する。
- 同意チェックなしで setup API を叩くと 422。
- consents 行は UPDATE 禁止（RLS/トリガ）で、撤回は revoked_at の追記のみで表現される。

### R-10 電子消費者契約法の確認・訂正画面

| ID | Phase | 根拠 |
|---|---|---|
| R-10 | 1 | 電子消費者契約法3条 / 特商法12条の6 / 規約15条（標準条項の抜け: 所見34） |

要件
- 申込みの意思表示（登録・Pro申込み）の直前に、入力内容（居住国、年齢確認、同意する文書名とバージョン、決済の場合はプラン・価格・更新条件）を一覧表示し「内容を確認して登録する」ボタンを置く。一覧から「修正する」で前画面へ戻れる。
- 登録は無償だが、Pro申込みは R-14 の最終確認画面が本要件を兼ねる。登録側は簡易な確認ステップで足りる（1画面内で「入力→確認表示→確定」の構成でよい）。
- 規約15条に「申込み内容の確認・訂正画面を設けている」旨を追記する（文書側）。

受入基準
- 登録フローに、確定ボタンを押す前に入力値が読み取れる状態が存在し、修正のために戻れる。
- Pro申込みで R-14 の画面を経由せずに Checkout セッションが作成できない（直接 API 呼び出しは `confirmation_token` 必須で拒否）。

### R-11 契約言語の記録

| ID | Phase | 根拠 |
|---|---|---|
| R-11 | 1 | rollout「契約言語主義」/ 規約14条3項（改訂後）/ 所見8 |

要件
- `users.contract_language TEXT`（`ja | en`、Phase 3 で拡張）を追加。登録時に表示していたUI言語を保存し、consents.language とも一致させる。
- UI言語を後から切り替えても契約言語は自動では変わらない。契約言語の変更は「その言語版の規約に再同意する」操作としてのみ可能（設定画面 > 言語 > 「英語版の規約に切り替えて同意する」）。
- 規約の版表示・通知メール（R-59）・最終確認画面（R-14）は契約言語で送る。

受入基準
- 英語UIで登録したユーザーの contract_language が `en`、consents.language も `en`。
- UI言語をjaに変えても contract_language は変わらず、明示的な再同意でのみ変わる。

---

## 3. 決済フロー（Phase 1: 日本居住者のみ）

### R-12 Stripe Checkout の請求先国を JP に限定

| ID | Phase | 根拠 |
|---|---|---|
| R-12 | 1 | rollout「Pro課金は日本居住者のみ」/ 所見17・29 |

要件
- 三段構えで担保する。
  1. **事前ゲート**: `/api/billing/checkout` は `canPurchasePro(users.country)` が true のときのみセッションを作成する。false の場合は 403 と「現在Proは日本にお住まいの方にのみ提供しています」を返し、UIでは料金ページの購入ボタンを非活性+説明文にする。
  2. **Checkout 設定**: `billing_address_collection: 'required'`、Customer を事前作成し `address.country` を users.country で初期化、`customer_update.address: 'auto'`。通貨は JPY 固定、`locale` は契約言語。Stripe 側で請求先国の許可リストを設定できる場合は JP のみを許可する（設定可能性は実装時に確認）。
  3. **事後検証**: `checkout.session.completed` で `customer_details.address.country` を検証し、JP 以外なら (a) subscription を即時 `cancel` し全額返金（`refund`）、(b) users.billing_country を保存したうえで Pro を付与しない、(c) 「お住まいの地域では現在Proをご提供できません」メールを送る、(d) 監査ログに記録する。
- **課金不可国への変更**（R-05 から呼ばれる）: 既存契約は現在の期間末で `cancel_at_period_end=true` にし、理由をメールとアプリ内通知で伝える。即時停止・即時返金は行わない `[要弁護士確認]`。

受入基準
- users.country=US のユーザーで checkout API が 403 を返す。
- Checkout 完了 webhook のテストイベントで請求先国 US を送ると、subscription が cancel され、users.plan が Free のまま、通知メールがキューに積まれる。
- 請求先国 JP の正常系で Pro が付与され、billing_country='JP' が保存される。

### R-13 18歳以上の確認（Pro購入）

| ID | Phase | 根拠 |
|---|---|---|
| R-13 | 1 | 民法5条 / rollout「Pro購入は18歳以上」/ 規約7条（追記）/ 所見14 |

要件
- R-14 の最終確認画面に「私は18歳以上（居住国の成年年齢以上）です」チェックボックスを置く。既定は未チェック。閾値は `getMinPurchaseAge(users.country)`。
- チェック時刻を `users.adult_confirmed_at` に保存し、consents に `doc_type='adult_18'` を記録する。以後の再購入では省略可（保存済みなら表示のみ）。
- 未成年による購入を許可しない（法定代理人同意フローは作らない）。規約7条は「18歳未満の方はProを購入できません」の構成に揃える。

受入基準
- 未チェックで確認画面の確定ボタンが押せず、直接 API を叩いても 422。
- チェック後に adult_confirmed_at と consents 行が生成される。

### R-14 特商法12条の6 最終確認画面

| ID | Phase | 根拠 |
|---|---|---|
| R-14 | 1 | 特商法12条の6・15条の4 / 電子消費者契約法3条 / 特商法表記 付記 / 所見9・33 |

要件
- Stripe Checkout へリダイレクトする**前**に、当社ドメイン上で最終確認画面（`/billing/confirm`）を表示する。Checkout の `custom_text` は補助であり、当社画面が正本。
- 表示必須項目（規約7条・特商法表記と文言を一致させる）:

| 項目 | 表示内容（Phase 1） |
|---|---|
| 分量（提供内容） | Proプランの内容（年表数無制限・AI下書き無制限（公正利用の範囲）・PNG高解像度書き出し・埋め込み）。「無制限」には打消し表示を同等サイズで近接表示（所見16） |
| 価格 | ¥800/月 または ¥6,800/年（税込）。選択中のプランを強調 |
| 支払時期・方法 | 申込み時に初回請求、以降は各更新日に自動請求。クレジットカード（Stripe） |
| 提供時期 | 決済完了後ただちに利用可能 |
| 申込期間 | 期間の定めなし（キャンペーン時のみ表示） |
| 自動更新条件 | 月額=1ヶ月ごと / 年額=12ヶ月ごとに、解約するまで自動更新。年額は更新30日前にメールで事前案内 |
| 解約方法 | 設定画面「プラン」またはStripe顧客ポータルからいつでも解約可。解約後は期間末までPro、その後Freeへ移行（R-17 の挙動を要約表示） |
| 返金 | 法令に定めがある場合を除き返金不可。年額の途中解約も残期間の返金なし |
| リンク | 利用規約・特定商取引法に基づく表記・プライバシーポリシー（すべて1クリックで新規タブ） |
| 同意 | 「上記の内容を確認し、利用規約に同意して申し込む」（未チェックでは進めない）+ R-13 の18歳確認 |

- 確定ボタン押下で `billing_confirmations(id, user_id, plan, price_id, disclosure_version, contract_language, snapshot JSONB, confirmed_at)` に表示内容のスナップショットを保存し、その `confirmation_token` を付けて `/api/billing/checkout` を呼ぶ。Checkout セッションの `metadata.confirmation_id` に紐付ける。
- Checkout 側にも `custom_text.submit`（自動更新・解約方法・返金不可の要約）と `consent_collection.terms_of_service='required'` を設定し、`terms_of_service_url` を規約に向ける。
- 表示内容は契約言語（R-11）で出す。英語版は日本語版と同一内容の翻訳。

受入基準
- 確認画面のスクリーンショットに上記10項目がすべて含まれ、スクロールなしで確定ボタン近傍に「自動更新」「解約方法」「返金不可」が見える（打消し表示の近接性）。
- confirmation_token なしの checkout API 呼び出しが 422 で拒否される。
- billing_confirmations に snapshot が保存され、Stripe セッションの metadata から辿れる。

### R-15 年額プランの更新前通知

| ID | Phase | 根拠 |
|---|---|---|
| R-15 | 1 | 規約7条4項 / 特商法12条の6（解約条件の実効性）/ 所見9 / Phase 2: CA ARL §17602(b)（15〜45日前） |

要件
- 年額 subscription について、`current_period_end` の **30日前**にメール「Proの年額プランが◯月◯日に¥6,800で更新されます」を送る。本文に更新日・金額・解約方法（設定画面リンク+Stripeポータルリンク）・「更新前に解約すれば請求されません」を含める。7日前の再通知は推奨（任意、設定値で切替）。
- 実装は Stripe の `invoice.upcoming`（Dashboard の事前通知日数を30日に設定）または自前の日次 Cron（`subscriptions.current_period_end - 30 days` を走査）のいずれか。二重送信防止のため `subscription_notices(subscription_id, kind, period_end, sent_at)` にユニーク制約で記録する。
- 月額プランには送らない（Phase 1）。Phase 2 の CA ARL・Phase 3 の仏 Loi Chatel 対応時は `getRenewalRule` に従い対象を拡張する。
- 価格変更（規約7条7項）と同時期の場合は、値上げ通知（R-59）を別メールで先に送る。

受入基準
- 年額契約のテストデータで period_end 30日前の Cron 実行によりメールが1通だけ生成され、再実行しても増えない。
- メール本文に更新日・金額・解約導線URLが含まれる。

### R-16 解約導線

| ID | Phase | 根拠 |
|---|---|---|
| R-16 | 1→3 | 規約7条5項 / 所見5 / Phase 3: BGB §312k（解約ボタン）・仏消費法典 L.215-1-1 |

要件（Phase 1）
- 設定画面「プラン」に「Proを解約する」ボタンを常設し、押下→確認ダイアログ（解約日=期間末、Free移行後の挙動 R-17 の要約）→ `cancel_at_period_end=true` を API 経由で設定→完了メール。ログイン後2クリック以内で到達できること。
- 併せて `POST /api/billing/portal` で Stripe 顧客ポータル（解約・支払方法変更・領収書）へのリンクを提供する。
- 解約取消（`cancel_at_period_end=false`）も同画面から可能。
- 解約手続にリテンション画面（引き止め）を挟む場合、1画面まで・スキップ可能とする。

要件（Phase 3 予約）
- ログイン不要で到達できる「契約をここで解約する」ボタン（`/cancel`）と確認ページ（メールアドレス等の識別情報入力→解約意思の確認→即時受領確認メール）を実装できるルート・テンプレートを予約しておく。

受入基準
- 設定画面から2クリック以内で解約確認ダイアログに到達し、確定で subscription の cancel_at_period_end が true になる。
- 解約完了メールに解約日と Free 移行後の挙動が記載されている。

### R-17 Free降格時の挙動

| ID | Phase | 根拠 |
|---|---|---|
| R-17 | 1 | rollout「Free降格時」/ 規約7条5項（改訂後）/ 所見20 / DCD 2019/770 Art.16(4)（Phase 3） |

要件
- 降格トリガ: 解約後の期間末、支払不履行による停止（規約7条8項）、R-12 後段。いずれも `subscription.deleted` / `customer.subscription.updated` webhook を起点にサーバー側で `users.plan='free'` に更新し、以下を enforce する。

| 対象 | 挙動 |
|---|---|
| Free上限（年表2本）を超える年表 | **閲覧・書き出し可（JPEG透かし）／編集不可／公開状態は維持**。編集可能な2本はユーザーが降格時に選択（未選択なら更新日時が新しい2本）。「凍結」ラベルを一覧に表示 |
| 埋め込み | **停止**。`GET /embed/:share_id` は所有者が Free の場合 HTTP 200 で「この埋め込みは現在利用できません」のプレースホルダ（GA非搭載・軽量）を返す。復帰時に自動再開 |
| PNG高解像度書き出し | 不可（Freeの JPEG透かしのみ） |
| AI下書き・アシスト | Free の月次上限に戻る（当月使用分はカウンタ継続） |
| データ | 削除・非公開化はしない。JSON エクスポート（R-50）は常に可能 |

- 降格の1回目に、上記挙動を説明するメール+アプリ内通知を送る。
- 補遺 §2 の「プラン制限はサーバー側で enforce」を本要件の各行に適用する。

受入基準
- Pro で3本の年表を持つユーザーを Free に降格させると、3本目の PATCH が 403、GET は 200、公開URLも 200 のまま。
- 降格ユーザーの embed URL がプレースホルダを返し、GA タグを含まない。
- 復帰（再購入）で同じ年表の PATCH が 200 に戻る。

### R-18 アカウント削除と同時のPro解約

| ID | Phase | 根拠 |
|---|---|---|
| R-18 | 1 | 規約11条3項（改訂: 「削除により同時に解約」）/ GDPR Art.17 / 所見19 |

要件
- アカウント削除 API は、active な subscription があれば同一トランザクション内で Stripe の `subscriptions.cancel`（即時）を呼び、成功後に論理削除（R-43）へ進む。Stripe 呼び出しが失敗した場合は削除を中断してエラー表示（「Proの解約処理に失敗しました。時間をおいて再度お試しください」）し、サポート導線を出す。
- 削除確認ダイアログに「Proは同時に解約され、残期間の返金は行いません（規約7条6項）」を明記する。
- Stripe Customer は削除せず（取引記録の法定保存 R-48）、`metadata.deleted_at` を付ける。

受入基準
- Pro ユーザーの削除で Stripe 側 subscription が canceled になり、users.deleted_at が設定される。
- Stripe をモックで失敗させると users は削除されず、UI にエラーが出る。

### R-19 サブスクリプション状態と取引記録

| ID | Phase | 根拠 |
|---|---|---|
| R-19 | 1 | 規約7条10項 / PP 10節（取引記録の保存）/ 補遺 §2 課金 |

要件
- `subscriptions(user_id, stripe_subscription_id, stripe_customer_id, plan, status, current_period_end, cancel_at_period_end, billing_country, created_at, updated_at)` を持ち、webhook で同期する。webhook は冪等（`stripe_events(id, type, processed_at)` で重複排除）。
- 領収書・請求履歴は Stripe 顧客ポータルへのリンクで提供する（自前生成しない）。
- users 削除後も subscriptions と stripe_events は残す（R-48）。

受入基準
- 同一 event id の webhook を2回受けても副作用が1回。
- 設定画面から顧客ポータルに遷移でき、請求履歴が閲覧できる。

### R-20 Phase 2/3 決済要件の予約

| ID | Phase | 根拠 |
|---|---|---|
| R-20 | 2/3 | rollout Phase 2・3 / 所見2・5・17 |

要件（実装は各 Phase、Phase 1 では設計余地の確保のみ）
- Phase 2（米国）: CA ARL に基づく更新前通知（月額含む）・トライアル転換通知・オンライン解約確認、Stripe Tax による売上税、`getCheckoutDisclosure='us_ca_arl'` の確認画面テンプレート。
- Phase 3（EU）: 撤回権告知（デジタル・サービス構成、14日以内の日割返金）とチェックボックス「撤回期間中の提供開始に明示的に同意」、法定撤回書式ページ、年額の月単位化+1ヶ月予告解約、解約ボタン（R-16 後段）、VAT OSS/Stripe Tax、総額表示。韓国・台湾は各国の解除権例外の技術的措置 `[要弁護士確認]`。
- Phase 1 で確保するもの: `legal_country_rules` の列（R-04）、`billing_confirmations.disclosure_version`、確認画面テンプレートの国別分岐点。

受入基準
- Phase 1 時点で `legal_country_rules` に上記の列が存在し、確認画面が `disclosure` キーでテンプレートを切り替える構造になっている（テンプレートは jp のみ）。

---

## 4. 同意管理（Cookie / GA4 / 外部送信）

### R-21 同意バナー（同意・拒否の同等表示）

| ID | Phase | 根拠 |
|---|---|---|
| R-21 | 1 | PP 8.2 / 電気通信事業法27条の12 / 所見24 / Phase 3: TDDDG §25・EDPB Cookieバナー・CNIL |

要件
- 初回訪問時（LP・アプリ共通）に、GA4 等の任意 Cookie について「同意する」「拒否する」を**同じ大きさ・同じ視認性**で並べたバナーを表示する。「×」で閉じる操作は拒否として扱う。詳細設定リンクから PP 8節へ遷移できる。
- 必須 Cookie（セッション、CSRF、言語、同意状態）はバナー対象外とし、その旨を明記する。
- バナーはページ操作を妨げないが、選択するまで再表示する（スクロールで自動同意しない）。
- Phase 1 では日本の要件（外部送信規律の通知・公表）を満たすことを主目的とし、Phase 3 の EU 要件（拒否同等・事前同意）も同じ設計で満たす。

受入基準
- バナーの2ボタンが同一スタイル（サイズ・コントラスト）で、a11y ツリー上どちらも button。
- 「拒否」または「×」後、`consent_state` Cookie が `denied` になり、次回訪問でバナーが出ない（12ヶ月）。

### R-22 拒否時に GA4 を発火させない

| ID | Phase | 根拠 |
|---|---|---|
| R-22 | 1 | PP 8.2 / 所見24 |

要件
- 同意前および拒否時は GA4 のスクリプト（gtag.js）を**読み込まない**（Consent Mode の denied 状態で読み込む方式ではなく、ロード自体を同意後に遅延させる）。同意後にのみ `<script>` を動的挿入する。
- GA4 は IP匿名化（既定）、Google Signals 無効、データ保持14ヶ月に設定する（PP 10節の設定値と一致）。
- 同意状態は第一者 Cookie `consent_state`（値: `granted|denied`、`version`、`ts`）で保持し、ログイン中は consents に `doc_type='cookie_analytics'` としても記録する。

受入基準
- 拒否状態でページを読み込んだ際、ネットワークログに `google-analytics.com` / `googletagmanager.com` へのリクエストが1件もない。
- 同意後にのみ gtag のリクエストが発生する。

### R-23 同意の保存期間12ヶ月と撤回UI

| ID | Phase | 根拠 |
|---|---|---|
| R-23 | 1 | PP 8.2・12.2 / GDPR Art.7(3)（Phase 3） |

要件
- `consent_state` Cookie の有効期限は12ヶ月。期限切れで再度バナーを出す。
- フッターの「Cookie設定」リンクと設定画面「プライバシー > 解析Cookie」から、いつでも同意/拒否を切り替えられる。撤回時は GA4 の Cookie（`_ga*`）を削除し、以降読み込まない。
- PP 8.2 の版が上がった（送信先の追加など）場合はバナーを再表示する（`consent_state.version` 不一致で判定）。

受入基準
- Cookie の Max-Age が 365日以内。
- 設定画面で「拒否」に切り替えると `_ga` Cookie が消え、リロード後も gtag が読み込まれない。

### R-24 埋め込み iframe では GA 非搭載

| ID | Phase | 根拠 |
|---|---|---|
| R-24 | 1 | PP 8節（追記）/ 所見24 |

要件
- `GET /embed/:share_id` の応答には GA4・同意バナー・外部フォント・その他の第三者送信を一切含めない。必要な計測は当社サーバーのアクセスログ（R-46）のみで行う。
- 埋め込みプレースホルダ（R-17）も同様。
- PP 8節に「埋め込み表示では解析ツールを使用しません」を明記する。

受入基準
- embed URL の読み込み時、当社ドメイン以外へのリクエストが 0 件（画像・フォント含む）。

### R-25 GPC / DNT 受信時は非発火

| ID | Phase | 根拠 |
|---|---|---|
| R-25 | 1 | PP 付則D.5（CalOPPA DNT開示）/ 所見40 / Phase 2: CCPA GPC |

要件
- リクエストに `Sec-GPC: 1` または `DNT: 1` が付いている場合、バナーの既定を「拒否」として扱い、GA4 を読み込まない。ユーザーが明示的に「同意する」を押した場合のみ上書きできる（その旨をバナーに一行表示）。
- PP D.5 の「DNTを尊重する」記述と一致させる。

受入基準
- `Sec-GPC: 1` を付けたリクエストで、バナー未操作の状態でも gtag が読み込まれない。

### R-26 フォントのセルフホスト化

| ID | Phase | 根拠 |
|---|---|---|
| R-26 | 1→3（Phase 3までに完了、Phase 1 で着手推奨） | rollout Phase 3「フォントのセルフホスト」/ 所見24（独 LG München 2022）/ CLAUDE.md（Erode=Fontshare、DM Sans / JetBrains Mono） |

要件
- Erode / DM Sans / JetBrains Mono を当社ドメイン（Cloudflare 配信）から配信し、Fontshare・Google Fonts への外部リクエストをなくす。ライセンス条件（Fontshare の再配布可否）を確認し、不可なら代替手段（購入ライセンス等）を判断する `[要確認]`。
- 埋め込み（R-24）と法定ページ（R-54）は Phase 1 からセルフホストにする（外部送信をなくすのが容易な範囲から先に）。
- PP 8節・6節の送信先一覧から Fontshare/Google Fonts を除外する。

受入基準
- 主要画面の読み込み時に `api.fontshare.com` / `fonts.googleapis.com` / `fonts.gstatic.com` へのリクエストが 0 件（Phase 3 完了条件。Phase 1 は embed と法定ページで 0 件）。

### R-27 外部送信規律の3点セット表示

| ID | Phase | 根拠 |
|---|---|---|
| R-27 | 1 | 電気通信事業法27条の12 / PP 8.1（表形式化）/ 所見24 |

要件
- PP 8.1 を「送信先事業者名 / 送信される情報 / 利用目的」の3列表にし、GA4（Google）・Stripe（決済ページ）・Anthropic（AI機能、サーバー経由のためユーザー端末からの直接送信ではない旨を注記）・Cloudflare（配信）・フォント（セルフホスト完了までの間）を列挙する。
- 同意バナーの「詳細」からこの表へ直接リンクする。
- 送信先が増減したらこの表を更新し、`consent_state.version` を上げる（R-23）。

受入基準
- 公開版 PP 8.1 が3列表であり、バナーからリンクされている。

---

## 5. AI表示・処理

### R-28 未検証AI下書き由来イベントの公開画面バッジ

| ID | Phase | 根拠 |
|---|---|---|
| R-28 | 1 | rollout「AI生成表示」/ 規約4条2項（追記）/ PP 5.3 / EU AI Act Art.50(4)（所見11） |

要件
- `events` に `origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','ai_generate','ai_assist'))` を追加。AI下書き（生成）およびAIアシストで作成・大幅改変されたイベントは `origin` を AI 由来として保存する。
- 表示条件: `origin <> 'manual' AND credibility = 'unverified'` のイベントには、viewer・埋め込み・公開プロフィール・OGP（可能な範囲）で「AI下書き・未検証」バッジを表示する。編集画面でも同じバッジを出す。
- ユーザーが信憑性を `verified` または `disputed` に変更（人的レビュー）するとバッジは消えるが、`origin` は変更しない（履歴として残す）。
- バッジ文言は日英で固定文言（規約4条2項と一致）。トーンは既存デザインに合わせ、装飾なし。

受入基準
- ai_generate 由来・unverified のイベントが viewer と embed でバッジ付きで描画される。
- credibility を verified に更新するとバッジが消え、DB の origin は変わらない。

### R-29 AI入力の Anthropic 送信ログ（当社側30日）

| ID | Phase | 根拠 |
|---|---|---|
| R-29 | 1 | PP 5.1・10節（AI処理ログ最長30日）/ 所見21 |

要件
- `ai_requests(id, user_id, feature('generate'|'assist'), model, input_chars, output_chars, timeline_id NULL, status, error_code NULL, created_at)` を記録する。**プロンプト本文・出力本文は保存しない**（生成結果はユーザーコンテンツとして events に残る）。デバッグ目的で本文を保存する場合は別テーブルで TTL 30日・アクセス制限。
- 日次 Cron で `created_at < now() - 30 days` の行を物理削除する。
- Anthropic 側の保持条件（不正利用監視のための一時保持）は PP 5.2 の記載に合わせ、API 呼び出しに当社の識別子（`metadata.user_id` はハッシュ化）以外の個人情報を付けない。

受入基準
- AI 呼び出し後に ai_requests に1行追加され、本文カラムが存在しない。
- 31日前の行が Cron 実行後に消えている。

### R-30 学習不使用の技術的担保

| ID | Phase | 根拠 |
|---|---|---|
| R-30 | 1 | rollout「AI学習利用: 利用しない」/ 規約3条3項・4条5項 / PP 5.2・5.4 / 所見21・30 |

要件
- Anthropic API は商用利用規約（学習不使用）のもとで利用し、学習利用をオプトインするいかなる設定・プログラムにも参加しない。ZDR（ゼロデータ保持）契約の要否は依頼者判断事項として記録する。
- 当社側でユーザーコンテンツ・AI入出力を機械学習の訓練データとして収集・書き出すジョブを作らない。統計（PP 6.3）は個人・年表を識別できない集計値のみ。
- 方針変更時は `consents.doc_type='ai_training_change'` によるオプトイン同意を取得するまで既存データを対象にしない（事前同意）。

受入基準
- コードベースに学習データ書き出しジョブが存在しない（レビュー時のチェックリスト項目）。
- PP 5.2 と規約4条5項の文言が同一趣旨（「利用しない」）で公開されている。

### R-31 利用回数カウンタ（生成/アシスト、月次リセット）

| ID | Phase | 根拠 |
|---|---|---|
| R-31 | 1 | 補遺 §3 プラン正本 / PP 5.5 / 規約7条1項 |

要件
- `ai_usage(user_id, period 'YYYY-MM', generate_count, assist_count, updated_at, PRIMARY KEY(user_id, period))`。カウントはサーバー側で AI 呼び出し成功時に加算（失敗時は加算しない）。
- リセットは UTC ではなく**日本時間の月初 0:00**（Phase 1）を基準とし、契約言語や国により変えない。基準タイムゾーンは料金ページに明記。
- Free: 生成3回/アシスト10回。上限到達時は 429 とアップグレード導線。Pro: 上限なし（R-32 の公正利用のみ）。
- マイページの Assist 使用量バー（補遺 §4）はこのテーブルを参照する。

受入基準
- Free ユーザーの4回目の生成が 429。
- 月をまたぐと新しい period 行でカウントが 0 から始まる。

### R-32 公正利用のレート制限

| ID | Phase | 根拠 |
|---|---|---|
| R-32 | 1 | 規約4条8項（公正な利用）/ 所見16（打消し表示） |

要件
- Pro の AI 機能に、料金ページ・特商法表記に数値で明示する上限（例: 生成 1日30回・月300回、アシスト 1日100回・月1,000回 `[要事業判断]`）を設ける。上限は `legal_country_rules` ではなく `plan_limits` 設定で管理し、料金ページの表示値と同一ソースから出す。
- 上限到達時は 429 と「公正利用の範囲を超えました。◯時にリセットされます」を返す。自動化・スクリプト利用の検知（短時間の大量呼び出し）は別途 Cloudflare Rate Limiting で保護。
- 「無制限」表記の近接に「公正利用の範囲: 1日◯回まで」を同等サイズで表示する（R-14 と共通の文言）。

受入基準
- 設定値を超える呼び出しが 429 になる。
- 料金ページの「無制限」の直下に上限値が表示され、その値が plan_limits と一致する。

---

## 6. 通報・通知削除

Phase 1 で日本のプロ責法と DSA Art.16/17 相当の最小手続を満たし、Phase 2 で DMCA §512、Phase 3 で DSA の残余（Art.20 の内部苦情処理期間、および法令上義務づけられる場合に限り透明性報告）に拡張する。運営方針として、法令上必須でない定期公表・報告は行わない。手続の正は CP（新設文書）。

### R-33 reports テーブルの再設計

| ID | Phase | 根拠 |
|---|---|---|
| R-33 | 1 | 補遺 §1 reports（置換）/ PP 10節（通報記録3年）/ 所見6・31 / DSA Art.16(2)・17 |

要件
- 補遺の `reports` を以下に置換する（DDL は §12）。
  - `type`: `violation`（規約違反通報、匿名可）| `rights`（権利侵害申告: 著作権・名誉毀損・プライバシー等、氏名・連絡先必須）
  - 対象スナップショット: `timeline_id UUID NULL REFERENCES timelines(id) ON DELETE SET NULL`、`event_id UUID NULL ... ON DELETE SET NULL`、`target_owner_id UUID NULL ... ON DELETE SET NULL`、`target_title TEXT NOT NULL`、`target_url TEXT NOT NULL`（通報時点の値を必ずコピー）
  - `reporter_id UUID NULL REFERENCES users(id) ON DELETE SET NULL`、`reporter_name`、`reporter_email`、`reporter_org`（任意）、`is_anonymous BOOL`
  - `category`（`copyright | defamation | privacy | hate | illegal_other | spam | harassment | policy_other`）、`description TEXT NOT NULL`、`legal_basis TEXT NULL`、`sworn_good_faith_at TIMESTAMPTZ NULL`（rights は必須）
  - `status`: `received | under_review | owner_consulted | action_taken | rejected | appealed | appeal_upheld | appeal_dismissed | closed`
  - 措置: `action`（`none | unlisted | private | event_removed | timeline_removed | account_suspended | account_terminated`）、`decision_reason TEXT`（事実・規約/法的根拠・救済手段の3点を含むテンプレート）、`decided_at`、`decided_by`（運営ユーザーID）、`appeal_deadline`（decided_at + 14日）
  - 異議: `appeal_text`、`appealed_at`、`appeal_decision`、`appeal_decided_at`
  - `created_at`、`closed_at`、`retain_until`（closed_at + 3年）
- 通知履歴は `report_notifications(id, report_id, recipient('reporter'|'owner'), kind('ack'|'owner_inquiry'|'decision'|'appeal_ack'|'appeal_decision'), channel('email'|'in_app'), sent_at, template_version)` に分離。
- 運営メモは `report_notes(id, report_id, author_id, body, created_at)`。
- RLS: 通報者本人は自分の reports の status のみ SELECT 可。対象所有者は自分宛の措置通知（decision_reason）のみ閲覧可。それ以外は運営ロールのみ。
- 通報者・対象所有者・年表が削除されても reports 行は残る（SET NULL + スナップショット）。R-44 の匿名化と組み合わせる。

受入基準
- 年表を削除しても関連 reports 行が残り、timeline_id が NULL・target_title/url が保持されている。
- 通報したユーザーを削除しても FK 違反にならず reporter_id が NULL になる。
- rights タイプで sworn_good_faith_at / reporter_name / reporter_email が NULL の INSERT が CHECK 制約で失敗する。

### R-34 通報フォーム2種

| ID | Phase | 根拠 |
|---|---|---|
| R-34 | 1 | rollout「通報者」/ 規約6条 / CP / DSA Art.16(2) / プロ責法3条 / 所見6 |

要件
- viewer・explore カード・公開プロフィールの通報ボタンから、最初に「規約違反を通報する」「権利侵害を申告する」の2択を出す。

| | 規約違反通報（violation） | 権利侵害申告（rights） |
|---|---|---|
| ログイン | 任意（未ログイン可、匿名可） | 任意（未ログイン可、R-39） |
| 必須項目 | カテゴリ・説明 | 氏名・連絡先メール・対象URL・侵害内容の説明・権利の根拠（著作物の特定等）・「申告内容が正確であり善意で行うことを誓います」チェック |
| 任意項目 | 連絡先（結果通知を希望する場合） | 所属・電話 |
| 対象 | 年表 or 個別イベント | 年表 or 個別イベント |
| 受領確認 | 連絡先があれば送る | 必ず送る（R-35） |

- 対象URL・タイトルはフォーム側で自動補完し、スナップショットとして保存する（R-33）。
- スパム対策として Cloudflare Turnstile を両フォームに設置。
- 「通報者の氏名・連絡先は発信者に開示しないが、申告の内容は伝えることがある」旨をフォームに明記（規約6条5項改訂と一致）。

受入基準
- 2種のフォームがそれぞれの必須項目を欠くと送信できない。
- 送信後 reports に type が正しく入り、対象スナップショットが埋まる。

### R-35 受領確認メール

| ID | Phase | 根拠 |
|---|---|---|
| R-35 | 1 | CP / DSA Art.16(4) / 所見6 |

要件
- 連絡先のある通報について、受信後ただちに受領確認メール（受付番号、対象URL、今後の流れ、想定回答期間）を送り、`report_notifications(kind='ack')` に記録する。
- 受付番号は `reports.id` ではなく短い公開用番号（`report_no`、例 `R-2026-000123`）を採番して用いる。

受入基準
- rights 通報の送信後に ack メールがキューに積まれ、report_notifications に行がある。

### R-36 結果通知と措置理由の陳述

| ID | Phase | 根拠 |
|---|---|---|
| R-36 | 1 | CP / 規約6条4項（「回答します」に改訂）/ DSA Art.16(5)・17 / 所見6 |

要件
- 運営が決定（措置あり/なし）を登録すると、通報者（連絡先あり）に結果通知、対象所有者に措置通知（措置がある場合）を自動送信する。
- 措置通知には必ず、(1) 対象（タイトル・URL）、(2) 措置内容、(3) 事実関係の要約、(4) 根拠（規約/CP の条項、法令）、(5) 異議申立の方法と期限（R-37）を含める。`decision_reason` テンプレートの必須欄で担保する。
- 通報者向け通知には措置内容の要約と、不服の場合の連絡先を含める（通報者に発信者情報は開示しない）。
- 通知は契約言語（対象所有者）/フォーム言語（通報者）で送る。

受入基準
- decision_reason の必須欄が未入力だと管理画面で決定を保存できない。
- 決定保存後に reporter/owner 宛の report_notifications 行が生成される。

### R-37 異議申立（14日）

| ID | Phase | 根拠 |
|---|---|---|
| R-37 | 1→3 | rollout「異議申立（14日）」/ CP / 規約6条・11条2項 / DSA Art.20（Phase 3 で期間再検討）/ 所見6 |

要件
- 措置通知から**14日以内**、対象所有者はアプリ内（通知詳細画面）またはメールで異議を申し立てられる。アプリ内では `POST /api/reports/:id/appeal` に本文を送信し status を `appealed` に更新。
- 異議は元の決定者と別の担当者が審査する（運営2名体制。1名体制の場合は同一人物が「初回」「異議」の別のチェックリストで再審査し記録） `[要運用決定]`。
- 異議の結果（維持/取消）を対象所有者に通知し、取消の場合は措置を自動で巻き戻す（visibility 復元等）。
- 期限経過後の異議はアプリ内では受け付けないが、メールでの受付は妨げない（運営判断）。
- Phase 3（EU）では DSA Art.20 に基づき期間を6ヶ月に延長する設定を `legal_country_rules` 経由で切り替えられるようにしておく。

受入基準
- 措置通知から14日以内は appeal API が 200、15日目以降は 410。
- 異議取消の決定で timeline.visibility が措置前の値に戻る。

### R-38 反復侵害者カウンタ

| ID | Phase | 根拠 |
|---|---|---|
| R-38 | 1→2 | rollout「反復侵害者ポリシー」/ CP / DMCA §512(i)（Phase 2）/ 所見6 |

要件
- `enforcement_actions(id, user_id, report_id NULL, kind('strike'|'warning'|'suspension'|'termination'), reason, created_at, expires_at)` を新設。措置 `action_taken` かつ type=rights（または重大な violation）で `strike` を1件記録する。異議で取消された場合は該当 strike を無効化（`voided_at`）。
- `users.strike_count`（有効な strike の集計、トリガまたは集計ビュー）を持ち、閾値（例: 12ヶ月内に3件 `[要事業判断]`）到達時に管理画面で「アカウント停止候補」として表示する。自動停止はしない（Phase 1 は人的判断）。
- 反復侵害者ポリシーの閾値と手続は CP に公表する。

受入基準
- 3件目の有効 strike で管理画面の候補一覧に当該ユーザーが表示される。
- 異議で取消された strike が集計から除かれる。

### R-39 非ユーザー用申告フォーム

| ID | Phase | 根拠 |
|---|---|---|
| R-39 | 1 | 規約6条（「ユーザーでない方を含む」）/ 所見10 / プロ責法・DSA Art.16（電子的手段の提供） |

要件
- ログイン不要の公開ページ `/report`（LP・法定ページのフッターからリンク）で、対象URLを手入力して R-34 の2種フォームを利用できる。URL から年表・イベントを解決できればスナップショットを自動補完、できなければ手入力値をそのまま保存。
- Turnstile 必須、同一メールからの短時間連投を制限。
- CP に「権利を侵害されたと考える方（ユーザーでない方を含む）はこの窓口から」と記載しリンクする。

受入基準
- 未ログインで `/report` から rights 申告を送信でき、reports に reporter_id NULL・連絡先ありで保存される。

### R-40 運営用の最小管理画面

| ID | Phase | 根拠 |
|---|---|---|
| R-40 | 1 | 補遺 §1 reports 運用（「admin画面はMVPでは作らない」を撤回）/ 所見6・31 |

要件
- 運営ロール（`users.role='admin'`、Supabase RLS + ミドルウェアで二重に保護、IP制限推奨）のみアクセスできる `/admin/reports`。
- 機能: 一覧（status/type/期限でフィルタ、異議期限・回答期限の残日数表示）、詳細（スナップショット・通報内容・履歴・メモ）、措置の実行（限定公開化・非公開化・イベント削除・年表削除・アカウント停止）、決定理由テンプレート入力、通知の再送、メモ追加、strike 付与/取消。
- 措置の実行はすべて `moderation_audit(id, admin_id, report_id, action, before JSONB, after JSONB, created_at)` に記録。
- 加えて、アカウント削除の強制実行（R-07 の虚偽申告対応）と、権利行使請求（R-51）の一覧を同じ管理画面に置く。

受入基準
- 一般ユーザーが `/admin/reports` にアクセスすると 404 または 403。
- 非公開化の実行で timeline.visibility が private になり、moderation_audit に before/after が残る。

### R-41 発信者への意見照会（プロ責法）

| ID | Phase | 根拠 |
|---|---|---|
| R-41 | 1 | プロ責法3条2項2号 / CP / 所見6(c) |

要件
- rights 申告のうち、権利侵害の明白性が判断できない案件について、運営が「発信者に意見照会する」を選ぶと、対象所有者に「申告の内容（通報者の氏名・連絡先を除く）」と「7日以内に同意しない旨の申出がない場合、対象を非公開化することがある」旨をメール+アプリ内通知で送り、status を `owner_consulted`、`consult_deadline = now() + 7 days` を記録する。
- 所有者はアプリ内から「同意しない」と理由を返信でき、運営に通知される。
- 期限経過または回答に基づき運営が決定を登録する（R-36）。

受入基準
- 意見照会の送信で owner 宛通知が記録され、7日後に管理画面で「回答期限経過」と表示される。

### R-42 通報記録の保存期間

| ID | Phase | 根拠 |
|---|---|---|
| R-42 | 1 | PP 10節（対応完了後3年）/ 所見31 |

要件
- `reports.retain_until = closed_at + 3年`。日次 Cron で期限経過行を、`report_notifications` / `report_notes` とともに物理削除する。`enforcement_actions` は strike の有効期限（例12ヶ月）経過後も監査目的でユーザー削除まで残し、ユーザー削除時に匿名化（R-44）。
- 削除前に通報者・所有者の個人情報（氏名・メール）のみ先行してマスクする運用（closed から1年後）を推奨 `[任意]`。

受入基準
- closed_at が3年超の行が Cron 実行後に消えている。

---

## 7. データ削除・保存期間

### R-43 アカウント削除: 即時論理削除→30日で物理削除

| ID | Phase | 根拠 |
|---|---|---|
| R-43 | 1 | 規約11条3〜5項 / PP 10節 / GDPR Art.17 |

要件
- 削除 API: (1) R-18 の Pro 解約、(2) `users.deleted_at = now()`、`users.purge_after = now() + 30 days`、(3) セッション全失効、(4) 公開年表・プロフィール・埋め込み・OGP・explore 一覧から即時に除外（`deleted_at IS NULL` を全公開クエリの条件に含める。RLS で強制）、(5) 検索エンジン向けに公開URLは 410 Gone を返す、(6) 削除受付メール（取消不可の旨と、法定保存データの説明）。
- 猶予中の復元機能は提供しない（規約11条5項「不可逆」に一致）。
- 日次 Cron（Cloudflare Cron Trigger → Supabase 関数）で `purge_after < now()` のユーザーを物理削除。順序: 依存レコードの処理（R-44）→ storage のファイル（書き出し画像・エクスポート）→ auth ユーザー → users 行。各ステップを `deletion_jobs(user_id, step, status, ran_at, error)` に記録し、失敗時はアラート。
- OAuth プロバイダのトークンは論理削除時点で破棄。

受入基準
- 削除直後に公開年表URLが 410、explore API の結果に含まれない、ログイン不可。
- purge_after 経過後の Cron でユーザー行・auth ユーザー・storage が消え、deletion_jobs に成功記録がある。

### R-44 依存レコードの扱い

| ID | Phase | 根拠 |
|---|---|---|
| R-44 | 1 | 規約11条6項（カウントは残る）/ PP 10節 / 所見31 |

要件（物理削除時）

| テーブル | 扱い |
|---|---|
| timelines / events / layers / event_sources | 物理削除（CASCADE） |
| likes（他人の年表への本人のいいね） | 本人紐付け行を削除するが、`timelines.like_count` は**減算しない**（カウント維持）。実装: likes に `ON DELETE CASCADE` を張らず、purge ジョブで `DELETE ... WHERE user_id = ?` を実行し、カウント再計算トリガをスキップするフラグで実行 |
| bookmarks | 同上（`bookmark_count` 維持） |
| reports（通報者として） | `reporter_id` SET NULL、`reporter_name/email` を `'[deleted]'` に匿名化。対象所有者としては `target_owner_id` SET NULL、スナップショット維持 |
| enforcement_actions / moderation_audit | user_id を NULL 化し、匿名の監査記録として保持 |
| consents | 保持しない（同意の立証はアカウント存続中に限る）。ただし削除受付の事実は deletion_jobs に残す |
| notifications | 物理削除 |
| ai_requests / ai_usage | 物理削除（30日ログは自然消滅） |
| subscriptions / stripe_events / billing_confirmations | 保持（R-48）。user_id は保持するが users 行がないため FK は張らない、または `ON DELETE SET NULL` にし `stripe_customer_id` で紐付ける |
| exports | ファイルとレコードを削除 |
| data_subject_requests | 対応完了後2年保持（PP 10節「問い合わせ記録」に準ずる）、user_id は SET NULL |

- 補遺の bookmarks `ON DELETE CASCADE` はカウント維持のため上記方式に改める（トリガでカウント減算していると矛盾するため）。

受入基準
- ユーザーAがいいねした年表の like_count が、Aの物理削除後も変わらない。
- Aが通報者だった reports 行の reporter_id が NULL、reporter_email が `[deleted]`。

### R-45 バックアップ / PITR の設定と90日以内消滅

| ID | Phase | 根拠 |
|---|---|---|
| R-45 | 1 | 規約11条4項・PP 10節（バックアップは最長90日）/ 所見31 |

要件
- Supabase のバックアップ設定（日次バックアップ保持日数・PITR 保持日数）を **90日以下**に設定し、設定値を運用ドキュメントに記録する。Cloudflare R2/Storage にエクスポート等を置く場合はライフサイクルルールで90日以内に削除。
- 手動でダンプを取る場合の保管期限も90日とし、取得記録を残す。
- 設定値と PP 10節の「最長90日」を突合し、乖離があれば PP を実態に合わせる（短くする方向のみ）。

受入基準
- Supabase ダッシュボードの保持設定が 90日以下で、運用ドキュメントに日付付きで記録されている。

### R-46 アクセスログ12ヶ月ローテーション

| ID | Phase | 根拠 |
|---|---|---|
| R-46 | 1 | PP 10節（アクセスログ・IP・端末情報 12ヶ月） |

要件
- 当社が保持するアクセスログ（Cloudflare Logpush/Workers ログ、Supabase ログ、アプリケーションの監査ログの IP/UA）を12ヶ月で削除する設定（Logpush 先ストレージのライフサイクル、ログテーブルの Cron 削除）。
- 第三者側（Cloudflare・Supabase・Stripe）の既定保持期間は PP 6節の記載に委ね、当社側で延長保存しない。
- セキュリティインシデント調査のための延長は R-64 の記録を条件に個別に行う。

受入基準
- ログ保管先のライフサイクル/Cron 設定が 365日以内。

### R-47 ウェイトリストメールの削除ジョブ

| ID | Phase | 根拠 |
|---|---|---|
| R-47 | 1 | PP 10節（公開後6ヶ月または配信停止時）/ 特電法 |

要件
- ウェイトリスト（LP v3）のメールアドレスは、本サービス公開日から6ヶ月後、または配信停止リンクのクリック時のいずれか早い時点で削除する。配信停止は即時（同期）で削除し、以後の送信対象から外す。
- 公開日を設定値 `LAUNCH_DATE` として持ち、日次 Cron で `LAUNCH_DATE + 6 months` 経過後に一括削除。
- 登録ユーザーへの移行（同じメールで登録）が起きても、ウェイトリスト側のレコードは同じ期限で削除する。

受入基準
- 配信停止リンクでレコードが即時に消える。
- LAUNCH_DATE を過去に設定した状態で Cron を実行するとテーブルが空になる。

### R-48 取引記録の法定保存

| ID | Phase | 根拠 |
|---|---|---|
| R-48 | 1 | PP 10節（最長10年）/ 法人税法・消費税法・商法（帳簿保存）`[要税理士確認]` |

要件
- Stripe 側: Customer・Invoice・Charge は削除しない（Stripe の保存に依拠）。
- 当社側: `subscriptions`・`stripe_events`・`billing_confirmations`（R-14 の表示スナップショット＝申込内容の記録）をユーザー削除後も保持。保持期限は `retain_until`（最終取引 + 10年 `[要税理士確認]`）を持ち、期限経過後に Cron で削除。
- これらの行は users を SET NULL し、`stripe_customer_id`・請求先国のみで識別できる状態にする（氏名・メールは保持しない。必要なら Stripe 側を参照）。

受入基準
- ユーザー物理削除後も subscriptions と billing_confirmations が残り、user_id が NULL。

### R-49 保存期間ジョブの一覧と監視

| ID | Phase | 根拠 |
|---|---|---|
| R-49 | 1 | PP 10節（全行）/ 所見31 |

要件
- 以下の日次 Cron を1つのスケジューラに集約し、実行結果（対象件数・成否）を `retention_jobs_log` に記録、失敗時に運営へ通知する。

| ジョブ | 対象 | 期限 |
|---|---|---|
| purge_users | users.purge_after 経過 | 30日 |
| purge_ai_requests | ai_requests | 30日 |
| purge_reports | reports.retain_until | 3年 |
| purge_waitlist | waitlist | 公開後6ヶ月 |
| purge_access_logs | ログテーブル | 12ヶ月 |
| purge_billing_records | retain_until | 10年 |
| purge_exports | exports.expires_at | 7日（R-50） |
| purge_dsr | data_subject_requests | 完了後2年 |
| purge_notifications | notifications | 12ヶ月 `[推奨値]` |

受入基準
- 各ジョブが retention_jobs_log に日次で1行ずつ記録される。

---

## 8. 本人の権利行使

### R-50 データエクスポート（JSON）

| ID | Phase | 根拠 |
|---|---|---|
| R-50 | 1 | PP 12.1（データポータビリティ）/ 規約9条・11条5項 / GDPR Art.20 / DCD Art.16(4)（Phase 3） |

要件
- 設定画面「データ > すべてのデータを書き出す」から `POST /api/exports` を呼び、非同期で JSON（zip）を生成。内容: プロフィール・設定・年表（メタ・visibility・share_id・カバーシード）・レイヤー・イベント（全項目、origin・credibility・credibility_note 含む）・出典・自分のいいね/ブックマークの対象ID一覧・consents・subscriptions の要約。他人のデータ（自分の年表へのいいねをした人など）は含めない。
- 生成完了でメール通知、署名付きURL（有効7日）からダウンロード。`exports(id, user_id, status, file_path, requested_at, completed_at, expires_at)`。
- 1ユーザーあたり同時1件、1日3回まで。Free/Pro とも利用可（R-17 の「書き出し可」を満たす）。
- 個別年表の JSON 書き出しも同じスキーマで提供（viewer の書き出しメニュー）。
- スキーマは `docs/export-schema.json`（JSON Schema）としてバージョン管理し、ファイルに `schema_version` を含める。

受入基準
- エクスポート実行後7日以内にダウンロードでき、8日目に 410。
- 出力 JSON が JSON Schema で妥当。

### R-51 開示・訂正・削除等の受付導線

| ID | Phase | 根拠 |
|---|---|---|
| R-51 | 1 | PP 12.2 / 個情法33〜35条 / GDPR Art.15〜21（Phase 3） |

要件
- 設定画面「プライバシー > 個人情報に関する請求」から種別（開示 / 訂正 / 削除 / 利用停止 / エクスポート / その他）と本文を送信 → `data_subject_requests(id, user_id NULL, email, type, body, received_at, verified_at, due_at, status, completed_at, response_summary)` に保存 → 受付番号付きの受領メール。
- メール（PP 12.2 記載の連絡先）での請求も同テーブルに運営が起票する。
- 管理画面（R-40）に一覧・期限アラート（due_at 7日前）を置く。
- 訂正・削除・エクスポートのうちアプリ内で自己完結できるものは、フォームの前段で該当機能へ誘導する。

受入基準
- 請求送信で行が作成され、受領メールが送られ、管理画面に表示される。

### R-52 本人確認方法

| ID | Phase | 根拠 |
|---|---|---|
| R-52 | 1 | PP 12.3 |

要件
- ログイン済みフォームからの請求は本人確認済みとして `verified_at` を即時設定。
- メール請求は、登録メールアドレスからの送信であることを確認し、それ以外は登録メール宛にワンタイムの確認リンクを送って `verified_at` を設定する（未確認のまま30日で自動クローズ）。
- 代理人請求は委任状等の書類確認を運営が行い、メモに記録。
- 確認に用いた情報は最小限（メール一致・リンククリック時刻）のみ保存。

受入基準
- 未登録メールからの請求が管理画面で「未確認」と表示され、確認リンクのクリックで verified_at が入る。

### R-53 対応期限のSLA

| ID | Phase | 根拠 |
|---|---|---|
| R-53 | 1→3 | PP 12.4（30日）/ GDPR Art.12(3)（1ヶ月、延長2ヶ月）/ 韓国 PIPA・台湾 PDPA の期限（Phase 3）`[要弁護士確認]` |

要件
- `due_at = verified_at + 30日`（共通）。`users.country` が EU/EEA の場合は `verified_at + 1ヶ月`（暦月）。延長時は理由を記録して `due_at` を更新し、本人に理由を通知（GDPR は最大2ヶ月延長）。
- 期限を `legal_country_rules.dsr_deadline_days` から取得し、Phase 3 で国別値を追加できるようにする。
- 期限超過は管理画面で赤表示+運営へ通知。

受入基準
- JP ユーザーの due_at が verified_at + 30日、DE ユーザーは +1ヶ月で計算される。

---

## 9. 法定表示・ページ

### R-54 法定文書の公開URLと版管理

| ID | Phase | 根拠 |
|---|---|---|
| R-54 | 1 | 規約12条5項（変更履歴の掲載）/ PP 14節 / 特商法11条 / 民法548条の3（内容の表示） |

要件
- 公開URL（固定、リダイレクトしない）:

| 文書 | URL | 言語 |
|---|---|---|
| 利用規約 | `/legal/terms` | ja / en |
| プライバシーポリシー | `/legal/privacy` | ja / en |
| 特定商取引法に基づく表記 | `/legal/tokushoho` | ja（en は参考訳） |
| コンテンツポリシーおよび通知・措置の手続 | `/legal/content-policy` | ja / en |
| 変更履歴 | `/legal/changelog` | ja / en |
| Cookie・外部送信一覧（PP 8節への anchor でも可） | `/legal/privacy#cookies` | ja / en |

- `legal_document_versions(doc_type, version, language, published_at, effective_at, is_major BOOL, changelog TEXT, content_hash)` で版を管理し、ページ上部に「版: 2026-xx-xx / 効力発生日 / 前版との差分へのリンク」を表示。過去版は `/legal/terms?version=...` で閲覧可能。
- 各文書はログイン不要・noindex 不可（検索可能）・印刷/保存可能（PDFダウンロードまたは印刷スタイル）。
- ページは docs/legal/build（build-legal.js + legal-template.html）から生成し、公開版とリポジトリの Markdown が一致することを CI で検証する。
- 埋め込み・OGP を除く全画面のフッターに R-55 のリンクを常設。

受入基準
- 上記6URLがすべて 200 を返し、版・効力発生日が表示される。
- consents.doc_version が legal_document_versions に存在する版を参照している（FK）。

### R-55 フッター常設リンク

| ID | Phase | 根拠 |
|---|---|---|
| R-55 | 1 | 特商法11条・特商法表記 付記（1クリック以内）/ CalOPPA（プライバシーポリシーの目立つ掲示）/ 電気通信事業法27条の12 |

要件
- LP・アプリ全画面（モバイル含む）・公開プロフィール・viewer のフッターに「利用規約 / プライバシーポリシー / 特定商取引法に基づく表記 / コンテンツポリシー / Cookie設定 / 通報・申告 / お問い合わせ」を常設。ヘッダー規則（100px）には触れず、フッターはデザインシステムに従う。
- 料金ページと R-14 の確認画面からは特商法表記へ1クリック。

受入基準
- 主要画面のフッターに7リンクがあり、モバイル幅でも折り返して表示される。

### R-56 30日前通知の仕組み（版更新ワークフロー）

| ID | Phase | 根拠 |
|---|---|---|
| R-56 | 1 | 規約12条2項 / 民法548条の4第2項 / PP 14節 / 所見12 |

要件
- 運営が `legal_document_versions` に新版を `is_major=true` で登録すると、`effective_at` は `published_at + 30日以上`でなければ保存できない（バリデーション）。軽微な変更（`is_major=false`）は即時効力可だが、法令改正対応は major 扱いにする（所見12）。
- 登録と同時に R-59 の通知（メール+アプリ内）をキューに積み、effective_at 到来時に自動で「現行版」を切り替える。
- effective_at 以降の初回ログインで再同意画面（R-09 reconsent）を表示。Pro 利用者が同意せず解約する場合の日割返金（規約12条4項）は運営が手動で Stripe から返金し、data_subject_requests ではなく `billing_adjustments` に記録 `[任意]`。

受入基準
- effective_at が published_at + 29日の major 版の登録が拒否される。
- effective_at 到来後に `/legal/terms` が新版を表示し、旧版が `?version=` で見られる。

### R-57 Phase 3 法定ページの予約

| ID | Phase | 根拠 |
|---|---|---|
| R-57 | 3 | rollout Phase 3 / 所見1・2・5・6 / DDG §5・BGB §312k・DSA Art.11-13・GDPR Art.27 |

要件（Phase 1 ではルートとフッター枠のみ予約、内容は Phase 3）
- `/legal/impressum`（独語版で必須。商号・代表者・所在地番地・電話または即応手段・登記情報・EU代表者/DSA法定代理人）
- `/legal/withdrawal`（撤回権告知+法定書式、Annex I(B)相当）
- `/cancel`（解約ボタン、R-16 後段）
- `/legal/dsa`（DSA Art.11/12 の連絡窓口、Art.13 法定代理人、透明性報告へのリンク）
- `/legal/ai-transparency`（AI Act Art.50 の表示、R-28 の説明）
- Phase 3 の各ページはネイティブ弁護士レビュー完了を公開条件とする（rollout）。

受入基準
- Phase 1: 上記ルートが 404 ではなく「準備中」または非リンクで、フッターコンポーネントに国別表示のフックがある。

### R-58 特商法表記・料金ページの実装要件

| ID | Phase | 根拠 |
|---|---|---|
| R-58 | 1 | 特商法11条・12条の6 / rollout「価格: 規約から分離、料金ページ+特商法表記が正」/ 所見15・16・26・33 |

要件
- 料金ページ（`/pricing`）と特商法表記の価格・条件は同一のデータソース（`plan_limits` + 価格定数）から描画し、規約本文に価格表を置かない。
- 特商法表記に法人の必須事項（販売業者名・代表者名または業務責任者名・所在地・電話番号（請求により遅滞なく開示する場合はその旨）・メール・価格・支払方法時期・提供時期・返品/解約条件・動作環境）を表示。`[TODO]` 値は rollout「依頼者確認待ち」の提供後に反映。
- 「無制限」の打消し表示（R-32）を料金ページ・特商法表記・確認画面で同一文言にする。
- 税込表示、「月あたり¥567」方式（「◯ヶ月分お得」不使用）。

受入基準
- 料金ページの価格を定数で変更すると、特商法表記と確認画面の価格も同時に変わる。

---

## 10. 通知

### R-59 規約変更の30日前通知（メール+アプリ内）

| ID | Phase | 根拠 |
|---|---|---|
| R-59 | 1 | 規約12条2項・13条1項（改訂: 到達擬制の緩和、重要通知はアプリ内併用）/ 民法548条の4 / 所見12 |

要件
- R-56 の major 版登録をトリガに、全アクティブユーザー（deleted_at IS NULL）へ契約言語でメール送信+`notifications(type='system', kind='legal_update')` を作成。本文: 変更概要・効力発生日・変更履歴URL・同意しない場合の手段（アカウント削除、Pro は解約と返金）。
- メールは配信停止不可（契約上の重要通知）。バウンス・未達はログに残す。
- アプリ内通知は既読になるまで通知一覧の先頭に固定。effective_at 以降は R-09 の再同意画面。
- 価格変更（規約7条7項）も同じ仕組みで送る（kind='price_change'）。

受入基準
- major 版登録後にユーザー数分のメールジョブと notifications 行が生成される。
- notification_preferences で機能案内をオフにしていても legal_update は届く。

### R-60 通知種別の限定（いいね / システム）

| ID | Phase | 根拠 |
|---|---|---|
| R-60 | 1 | 補遺 §1「notifications.type は ('like','system')」/ PP 4節（利用目的） |

要件
- Phase 1 の notifications.type は `like` と `system` のみ。system の `kind`: `legal_update | price_change | renewal_notice | downgrade | moderation | report_ack | report_decision | dsr | security`。
- いいね通知はアプリ内のみ（メール送信しない）。system のうちメール併送するものは kind ごとにテンプレート表で固定。
- 通知一覧の PP 4節の利用目的（サービス提供に必要な通知）に収める。マーケティング用途の通知は R-61 のオプトインがなければ作らない。

受入基準
- notifications.type の CHECK 制約が2値、kind の CHECK 制約が上記に限定される。

### R-61 機能案内メールはオプトイン+配信停止

| ID | Phase | 根拠 |
|---|---|---|
| R-61 | 1 | 特電法3条・4条 / PP 4節（目的追加）/ 所見37 / Phase 3: ePrivacy Art.13 |

要件
- `notification_preferences(user_id PK, product_updates_email BOOL NOT NULL DEFAULT false, like_in_app BOOL NOT NULL DEFAULT true, updated_at)`。既定オフ（オプトイン）。登録時のチェックボックスは既定未チェック（プレチェック禁止）。
- 機能案内メールには送信者表示・配信停止リンク（ワンクリックで `product_updates_email=false`、ログイン不要のトークン付き）・`List-Unsubscribe` ヘッダを付ける。
- 同意の取得と撤回は consents（`doc_type='marketing_email'`）にも記録。
- 重要通知（R-59・R-15・R-17・セキュリティ）は本設定の対象外であることを設定画面に明記。

受入基準
- 新規ユーザーの product_updates_email が false。
- 配信停止リンクのクリックで即時 false になり、以後の送信ジョブの対象から外れる。

---

## 11. セキュリティ・侵害対応

### R-62 侵害検知→72時間以内の当局通報フロー

| ID | Phase | 根拠 |
|---|---|---|
| R-62 | 1 | 個情法26条・規則7条（速報: 速やかに、確報: 30日/60日）/ GDPR Art.33（72時間、Phase 3 だが Phase 1 から同一フローで運用）/ PP 11節・A.7（追加）/ 所見25 |

要件
- インシデント対応手順書（`docs/legal/incident-runbook.md` を Phase 1 で作成）に、検知→初動（封じ込め・証拠保全）→影響評価（件数・データ種別・国別内訳を users.country で集計）→当局通報（個人情報保護委員会: 速報/確報、EU居住者が含まれる場合は Art.33 の72時間、韓国・台湾は Phase 3 で追加）→本人通知（R-63）→事後報告、の各ステップと責任者・期限を定める。
- `security_incidents(id, detected_at, summary, affected_count, affected_countries JSONB, data_categories, authority_notified_at, users_notified_at, status, postmortem_url)` に記録する。72時間の期限は detected_at から自動計算して表示。
- 検知手段の最低限: Supabase の監査ログ、Cloudflare WAF/ボット検知アラート、依存パッケージ脆弱性通知（Dependabot 等）、Stripe の不正検知通知を運営の共通チャネルに集約。

受入基準
- 手順書が存在し、担当者・連絡先・当局の窓口URLが記載されている。
- テーブルに記録した模擬インシデントの期限表示が detected_at + 72h。

### R-63 影響ユーザーへの通知

| ID | Phase | 根拠 |
|---|---|---|
| R-63 | 1 | 個情法26条2項 / GDPR Art.34 / PP 11節 |

要件
- 影響ユーザーへメール+アプリ内通知（kind='security'）で、発生事実・影響するデータ種別・当社の対応・ユーザーが取れる措置・問い合わせ先を契約言語で通知する。配信停止設定の対象外。
- 対象抽出は `security_incidents` に紐づく `incident_affected_users(incident_id, user_id, notified_at)` で管理し、二重送信を防ぐ。
- 削除済み（論理削除中）ユーザーは登録メールが残っている間は通知対象に含める。

受入基準
- 模擬インシデントで対象ユーザーに通知が1回だけ送られ、notified_at が記録される。

### R-64 連絡体制と記録

| ID | Phase | 根拠 |
|---|---|---|
| R-64 | 1 | PP 11節・15節 / 規約13条 / GDPR Art.33(5)（記録義務） |

要件
- セキュリティ連絡先（`security@` または PP 15節の連絡先）を PP と `/.well-known/security.txt` に公開する。
- 個情法上の責任者（PP 1節の事業者情報・代表者氏名）と実務担当者を運用ドキュメントに記載し、不在時の代行を定める。
- インシデントの記録（事実・影響・対応）は security_incidents に残し、通報不要と判断した場合もその理由を残す。

受入基準
- `/.well-known/security.txt` が 200 を返し、連絡先が PP と一致する。

---

## 12. spec-v2-addendum への差分一覧

補遺 v2 の §1（DB）・§2（API）・§4（画面）に対する追加・変更。DDL は方向性を示す骨子であり、型・インデックス・RLS の詳細は実装時に確定する。

### 12.1 テーブル・カラム

| 種別 | 対象 | 内容 | 要件 |
|---|---|---|---|
| 追加列 | users | `country CHAR(2) NOT NULL`, `country_source TEXT`, `country_updated_at`, `billing_country CHAR(2) NULL`, `contract_language TEXT NOT NULL`, `age_confirmed_at`, `adult_confirmed_at NULL`, `deleted_at NULL`, `purge_after NULL`, `role TEXT DEFAULT 'user'`, `strike_count INT DEFAULT 0` | R-01, R-03, R-07, R-11, R-13, R-38, R-40, R-43 |
| 新設 | user_country_history | `(user_id, country, source, reason, changed_at)` | R-01, R-05 |
| 新設 | legal_country_rules | `(country PK, annex, can_purchase BOOL, tax_mode, disclosure, renewal_rule, min_purchase_age INT, appeal_days INT, dsr_deadline_days INT, updated_at)` | R-04, R-37, R-53 |
| 新設 | legal_document_versions | `(doc_type, version, language, published_at, effective_at, is_major, changelog, content_hash, PRIMARY KEY(doc_type, version, language))` | R-54, R-56 |
| 新設 | consents | `(id, user_id FK ON DELETE CASCADE, doc_type, doc_version, language, accepted_at, revoked_at NULL, method, user_agent, ip_hash)`。UPDATE 禁止 | R-09, R-13, R-22, R-30, R-61 |
| 新設 | billing_confirmations | `(id, user_id NULL, plan, price_id, disclosure_version, contract_language, snapshot JSONB, confirmed_at, retain_until)` | R-14, R-48 |
| 新設 | subscriptions | `(user_id NULL, stripe_subscription_id UNIQUE, stripe_customer_id, plan, status, current_period_end, cancel_at_period_end, billing_country, created_at, updated_at, retain_until)` | R-19, R-48 |
| 新設 | stripe_events | `(id TEXT PK, type, processed_at)` | R-19 |
| 新設 | subscription_notices | `(subscription_id, kind, period_end, sent_at, UNIQUE(subscription_id, kind, period_end))` | R-15 |
| 追加列 | events | `origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','ai_generate','ai_assist'))` | R-28 |
| 新設 | ai_requests | `(id, user_id, feature, model, input_chars, output_chars, timeline_id NULL, status, error_code, created_at)`（本文なし、30日TTL） | R-29 |
| 新設 | ai_usage | `(user_id, period, generate_count, assist_count, updated_at, PK(user_id, period))` | R-31 |
| 新設 | plan_limits | `(plan, key, value, updated_at)` | R-32, R-58 |
| **置換** | reports | 補遺の4列定義を廃止し R-33 の定義に置換（`timeline_id ... ON DELETE SET NULL`, `reporter_id ... ON DELETE SET NULL`, スナップショット列, type/status/action/decision_reason/appeal 系, `report_no`, `retain_until`） | R-33 |
| 新設 | report_notifications | `(id, report_id, recipient, kind, channel, sent_at, template_version)` | R-33, R-35, R-36 |
| 新設 | report_notes | `(id, report_id, author_id, body, created_at)` | R-33, R-40 |
| 新設 | enforcement_actions | `(id, user_id NULL, report_id NULL, kind, reason, created_at, expires_at, voided_at)` | R-38 |
| 新設 | moderation_audit | `(id, admin_id NULL, report_id NULL, action, before JSONB, after JSONB, created_at)` | R-40 |
| 変更 | likes / bookmarks | `ON DELETE CASCADE` を外し、purge ジョブでカウント維持のまま本人行を削除 | R-44 |
| 新設 | deletion_jobs | `(user_id, step, status, ran_at, error)` | R-43 |
| 新設 | retention_jobs_log | `(job, ran_at, affected, ok, error)` | R-49 |
| 新設 | exports | `(id, user_id, status, file_path, requested_at, completed_at, expires_at)` | R-50 |
| 新設 | data_subject_requests | `(id, user_id NULL, email, type, body, received_at, verified_at, due_at, status, completed_at, response_summary)` | R-51〜R-53 |
| 新設 | notification_preferences | `(user_id PK, product_updates_email BOOL DEFAULT false, like_in_app BOOL DEFAULT true, updated_at)` | R-61 |
| 変更 | notifications | `type` は `('like','system')` を維持し `kind` 列を追加（CHECK は R-60） | R-60 |
| 新設 | security_incidents / incident_affected_users | R-62・R-63 の列 | R-62, R-63 |
| 新設 | waitlist（既存があれば列追加） | `unsubscribed_at`, 削除ジョブ対象 | R-47 |

reports 置換の DDL 骨子:

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('violation','rights')),
  category TEXT NOT NULL,
  timeline_id UUID NULL REFERENCES timelines(id) ON DELETE SET NULL,
  event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
  target_owner_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  target_title TEXT NOT NULL,
  target_url TEXT NOT NULL,
  reporter_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  reporter_name TEXT NULL,
  reporter_email TEXT NULL,
  reporter_org TEXT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  legal_basis TEXT NULL,
  sworn_good_faith_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','under_review','owner_consulted','action_taken','rejected',
                      'appealed','appeal_upheld','appeal_dismissed','closed')),
  consult_deadline TIMESTAMPTZ NULL,
  action TEXT NULL,
  decision_reason TEXT NULL,
  decided_at TIMESTAMPTZ NULL,
  decided_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  appeal_deadline TIMESTAMPTZ NULL,
  appeal_text TEXT NULL,
  appealed_at TIMESTAMPTZ NULL,
  appeal_decision TEXT NULL,
  appeal_decided_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ NULL,
  retain_until TIMESTAMPTZ NULL,
  CHECK (type <> 'rights' OR (reporter_name IS NOT NULL AND reporter_email IS NOT NULL
                              AND sworn_good_faith_at IS NOT NULL))
);
```

consents の DDL 骨子:

```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('terms','privacy','content_policy',
    'cookie_analytics','marketing_email','age_16','adult_18','ai_training_change')),
  doc_version TEXT NOT NULL,
  language TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  method TEXT NOT NULL CHECK (method IN ('signup','reconsent','settings','checkout','banner')),
  user_agent TEXT NULL,
  ip_hash TEXT NULL
);
-- RLS: 本人 SELECT/INSERT のみ。UPDATE は revoked_at の追記のみ許可（トリガで他列変更を拒否）
```

### 12.2 API

| 種別 | エンドポイント | 内容 | 要件 |
|---|---|---|---|
| 変更 | `POST /api/users/setup` | 入力に `country`, `age_confirmed`, `consents[]`（doc_type/version/language）, `contract_language`, `marketing_opt_in` を追加。欠落は 422 | R-07〜R-11, R-61 |
| 追加 | `PATCH /api/users/me/country` | 居住国変更+履歴+再判定 | R-02, R-05 |
| 追加 | `GET /api/legal/rules?country=` | 判定結果（付則・購入可否・開示種別・期限）を返す。UIはこれのみ参照 | R-04 |
| 追加 | `POST /api/billing/confirm` | 最終確認画面のスナップショット保存→`confirmation_token` 発行 | R-14 |
| 変更 | `POST /api/billing/checkout` | `confirmation_token` 必須、`canPurchasePro` ゲート、Checkout 設定（請求先住所必須・custom_text・ToS同意）| R-12, R-14 |
| 変更 | `POST /api/billing/webhook` | 冪等化、請求先国検証と非JP時の cancel/refund、subscriptions 同期、降格 enforce | R-12, R-17, R-19 |
| 追加 | `POST /api/billing/cancel` / `DELETE 同`（解約取消） | `cancel_at_period_end` の設定/解除 | R-16 |
| 追加 | `PATCH /api/users/me/plan-selection` | 降格時の編集可能年表の選択 | R-17 |
| 変更 | `DELETE /api/users/me` | Pro 同時解約→論理削除→purge 予約 | R-18, R-43 |
| 変更 | `GET /embed/:share_id` | 所有者 Free 時プレースホルダ、GA/外部送信ゼロ | R-17, R-24 |
| 追加 | `POST /api/consents` / `GET /api/consents/me` | 設定画面からの同意/撤回（cookie_analytics, marketing_email, contract_language 再同意） | R-09, R-11, R-23, R-61 |
| 変更 | `POST /api/ai/generate` / `POST /api/ai/assist` | ai_requests 記録、ai_usage 加算、plan_limits によるレート制限、出力に `origin` を付与 | R-28〜R-32 |
| **置換** | `POST /api/timelines/:id/report` → `POST /api/reports` | type 2種、対象は timeline/event、未ログイン可（Turnstile）、スナップショット保存、ack 送信 | R-33〜R-35, R-39 |
| 追加 | `POST /api/reports/:id/appeal`, `POST /api/reports/:id/consult-reply` | 異議申立、意見照会への回答 | R-37, R-41 |
| 追加 | `/api/admin/reports*`, `/api/admin/users/:id/(suspend|delete|strike)`, `/api/admin/dsr*` | 管理画面 API（admin ロール） | R-38, R-40, R-51 |
| 追加 | `POST /api/exports`, `GET /api/exports/:id`, `GET /api/timelines/:id/export?format=json` | データエクスポート | R-50 |
| 追加 | `POST /api/privacy/requests` | 権利行使請求の受付 | R-51〜R-53 |
| 追加 | `GET /api/legal/documents/:type?version=&lang=` | 版付き文書取得 | R-54 |
| 追加 | `PATCH /api/users/me/notification-preferences`, `GET /unsubscribe?token=` | 通知設定・ワンクリック配信停止 | R-61 |
| 追加 | Cron ハンドラ群 | renewal_notice(30日前), purge_users, purge_ai_requests, purge_reports, purge_waitlist, purge_access_logs, purge_billing_records, purge_exports, purge_dsr, legal_version_switch | R-15, R-43〜R-49, R-56 |

### 12.3 画面インベントリへの追加（補遺 §4 に追記）

9. 初回セットアップ画面の拡張: 年齢確認・国選択・同意ブロック・機能案内オプトイン（R-07〜R-11, R-61）
10. Pro最終確認画面 `/billing/confirm`（R-13, R-14）
11. 設定 > プラン: 解約ボタン・解約取消・顧客ポータル・降格時の年表選択（R-16, R-17）
12. 設定 > アカウント: 居住国変更・契約言語の再同意・アカウント削除（Pro同時解約の説明）（R-02, R-11, R-18）
13. 設定 > プライバシー: 解析Cookie切替・個人情報に関する請求フォーム・データエクスポート（R-23, R-50, R-51）
14. 同意バナー+フッター「Cookie設定」（R-21〜R-25）
15. 通報フロー: 2択→2種フォーム、公開ページ `/report`（R-34, R-39）
16. 通知詳細からの異議申立・意見照会回答（R-37, R-41）
17. 「AI下書き・未検証」バッジ（viewer / embed / プロフィール / 編集）（R-28）
18. 法定ページ群 `/legal/*` と変更履歴、Phase 3 予約ルート（R-54, R-57）
19. 再同意画面（規約改定後の初回ログイン）（R-09, R-56, R-59）
20. 管理画面 `/admin`（通報・措置・strike・DSR・強制削除）（R-40）
21. 埋め込みプレースホルダ（R-17）

### 12.4 補遺の記述で本書により上書きされる箇所

| 補遺の記述 | 変更後 |
|---|---|
| §1 reports「admin画面はMVPでは作らない」「timeline_id ON DELETE CASCADE」「reporter_id（ON DELETE句なし）」 | R-33 の定義に置換、最小管理画面を Phase 1 で作る（R-40） |
| §1 bookmarks `ON DELETE CASCADE` | カウント維持のため purge ジョブ方式に変更（R-44）。likes も同様 |
| §1 notifications.type `('like','system')` | 維持。`kind` 列を追加（R-60） |
| §2 課金3エンドポイント | confirm / cancel を追加、checkout・webhook の要件を拡張（R-12〜R-19） |
| §2 `POST /api/timelines/:id/report` | `POST /api/reports` に置換（R-34） |
| §2 サポート「問い合わせフォームは廃止し support@ メールリンク」 | 一般問い合わせはメールのまま。ただし通報2種（R-34/R-39）と権利行使請求（R-51）はフォームを持つ |
| §3 プラン正本「無制限」 | 公正利用の数値上限を近接表示（R-32, R-58）。価格・上限は plan_limits を単一ソースにする |
| §4 画面インベントリ 1〜8 | 9〜21 を追加 |

---

## 付録A 要件一覧（Phase 別）

| Phase | 要件ID |
|---|---|
| 1 | R-01, R-02, R-03, R-05, R-06, R-07, R-08, R-09, R-10, R-11, R-12, R-13, R-14, R-15, R-17, R-18, R-19, R-21, R-22, R-23, R-24, R-25, R-27, R-28, R-29, R-30, R-31, R-32, R-33, R-34, R-35, R-36, R-39, R-40, R-41, R-42, R-43, R-44, R-45, R-46, R-47, R-48, R-49, R-50, R-51, R-52, R-54, R-55, R-56, R-58, R-59, R-60, R-61, R-62, R-63, R-64 |
| 1→2 / 1→3（Phase 1 で最小実装、後続 Phase で拡張） | R-04, R-16, R-26, R-37, R-38, R-53 |
| 2/3（予約のみ） | R-20, R-57 |

## 付録B 依頼者・弁護士確認待ちの値（本書内の `[要…]`）

| 箇所 | 内容 |
|---|---|
| R-04 | 国別成年年齢テーブル、Phase 2/3 の課金可能国リスト |
| R-12 | 課金不可国への変更時に「期間末で停止」とする扱いの妥当性 |
| R-14 | Stripe Checkout の custom_text が12条の6の補助として十分か（当社画面を正本とする前提） |
| R-32 | 公正利用の数値上限（生成/アシスト、日次/月次） |
| R-37 | 異議審査の体制（2名体制か、1名の場合の手続） |
| R-38 | 反復侵害者の閾値（例: 12ヶ月内3件） |
| R-48 | 取引記録の当社側保存年数（10年案） |
| R-53 | 韓国・台湾の権利行使対応期限（Phase 3） |
| R-58 | 特商法表記の会社情報（rollout の TODO） |
| R-26 | Fontshare のセルフホスト可否（ライセンス） |
