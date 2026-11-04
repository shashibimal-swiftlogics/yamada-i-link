# Yamada i link — マスター設計書 / Master Blueprint

| 項目 Item | 内容 Value |
|---|---|
| 版 Version | **v0.2（ドラフト / DRAFT）** |
| 日付 Date | 2026-11-04 |
| 対象ブランチ Branch | `feature/ordering-admin-v0.2`（下書きブランチ・未push / draft branch, not pushed） |
| 状態 Status | テストデータのみ・承認前 / Test data only · not approved |
| 承認 Approval | 未承認。AIは「承認済み」と記載しない / Not approved. AI never marks anything APPROVED |

> **運用ルール / Operating rule**
> この文書がすべての正（マスター）です。機能を変える時は **先にこの文書を更新し、次にコードを変更し、最後にビルドと検証** を行います。
> This document is the single source of truth. For any change: **update this document first, then change code, then build and verify.**

---

## 0. 変更管理 / Change control

1. この文書の該当箇所（要件ID・データ定義・画面）を更新する。Update the affected section (requirement ID, data definition, screen) here first.
2. 変更履歴（§21）に1行追加する。Add one line to the change log (§21).
3. コードを変更し、テストを追加する。Change the code and add or update tests.
4. `npm test`（または `pnpm test`）と `pnpm build` を通す。Run tests and the production build.
5. 本番環境・Supabase本体・実データには一切触れない。Never touch production, the remote Supabase project, or real data.
6. 要件ID（FR-／NFR-）の状態を更新する。Update the status of each requirement ID.
7. コミットとpushは依頼があった時だけ行う。Commit and push only when explicitly requested.

---

## 1. 目的と範囲 / Purpose and scope

**日本語**
山田うどんの店舗が、明日の調理・メンテナンス用の食材・備品を発注し、工場と物流が出荷準備を行い、本部がマスタ（商品・店舗・拠点）を管理するためのシステムです。現在は **架空データによるサンプル** です。

**English**
A system for Yamada Udon shops to order the food ingredients and supplies needed for tomorrow's cooking and maintenance, for the factory and logistics teams to prepare shipments, and for head office to manage master data (products, shops, locations). It is currently a **sample using fictional data only**.

**範囲内 In scope（現在 current）**
- 店舗の発注（商品選択・カート・確認・履歴・店舗情報編集）/ Store ordering, cart, confirmation, history, shop account edit
- 工場・物流の出荷準備（集計・明細・状態更新・発注ごとのダウンロード）/ Factory and logistics picking, summaries, details, status updates, per-order downloads
- 管理者のマスタCSV管理（検証・適用・1つ前の版へ戻す）/ Admin master CSV management (validate, apply, roll back one version)
- 発注書の出力（Markdown・CSV・Excel・印刷・共有・メール）/ Order output (Markdown, CSV, Excel, print, share, email)

**範囲外 Out of scope（現在 current）**
- 実際の注文・配送・請求・税計算 / Real purchasing, delivery, invoicing, tax calculation
- 本物の認証・端末間同期 / Real authentication and cross-device sync（→ §12 で計画 / planned in §12）
- 実データの取り込み / Importing real company data

---

## 2. 原則と安全ルール / Principles and guardrails

| ID | 日本語 | English |
|---|---|---|
| G-01 | テストデータのみ。実データは承認まで投入しない。 | Test data only. No real data until approved. |
| G-02 | 秘密情報（DBパスワード、service_roleキー、メール送信キー）を文書・コード・チャットに書かない。 | Never put secrets (DB password, service_role key, email API key) in documents, code or chat. |
| G-03 | アプリはpublishable/anonキーのみ使用する（将来）。 | The app uses only the publishable/anon key (future). |
| G-04 | 本番環境・リモートSupabaseは、明示承認なしに変更しない。 | No change to production or the remote Supabase project without explicit approval. |
| G-05 | 下書きブランチのみ。mainへの直接変更なし。 | Draft branches only. No direct changes to main. |
| G-06 | AIは「承認済み」を記載しない。承認は人が行う。 | AI never marks anything APPROVED. Humans approve. |
| G-07 | 個人のGenesis ONEデータを、山田の企業資産に混ぜない。 | Personal Genesis ONE data is not merged into Yamada corporate assets. |
| G-08 | メールの宛先は画面から変更できない（サーバー側で固定）。 | Email recipient cannot be chosen from the screen (fixed server-side). |

---

## 3. 利用者と役割 / Users and roles

| 役割 Role | 日本語 | English | 現在の入口（デモ） Current demo entry |
|---|---|---|---|
| 店舗 `store` | 店舗スタッフ。自店舗の発注・店舗情報のみ。 | Store staff. Own-store orders and shop profile only. | 店舗を選択＋PIN 1234 |
| 工場・物流 `factory` | 工場・物流担当。全店舗の発注を集計・出荷。 | Factory and logistics. Aggregates and ships all store orders. | PIN 2345 |
| 管理者 `admin` | 本部。マスタCSVの管理。 | Head office. Manages master CSV. | PIN 3456 |

**注意 Note:** PINは体験用であり、本人認証ではありません（FR-AUTH参照）。/ The PINs are for demonstration only and are not authentication (see FR-AUTH).

**将来の役割 Target roles（Supabase `yil_sample.memberships`）:** `store`（店舗ID必須）, `hq`, `factory`。/ Target roles in the sample schema: `store` (store_id required), `hq`, `factory`.

---

## 4. 画面と利用の流れ / Screens and user flows

### 4.1 ログイン / Login（`app/page.js`）
- 役割タブ（店舗用・工場・物流・管理者）、店舗検索（全角半角・大文字小文字を区別しない）、PIN入力。
- Role tabs (store, factory, admin), shop search (ignores full/half width and case), PIN entry.
- 店舗はアクティブな店舗のみ表示。/ Only active shops are shown.

### 4.2 店舗：商品一覧 / Store: product list（`CatalogList.js`）
- 1ページ25件。カテゴリ・キーワード・選択済みのみ表示で絞り込み。/ 25 items per page. Filter by category, keyword, or selected only.
- 数量は0〜99（+/−ボタン、aria-label付き）。/ Quantity 0–99 with +/− buttons carrying aria labels.
- ページや絞り込みを変えても選択数量は保持される。/ Selected quantities survive page and filter changes.

### 4.3 店舗：カート → 確認 → 確定 / Store: cart → confirm → submit（`StoreView.js`）
- カートで合計を確認 → 発注内容確認（連絡事項200字以内）→「テスト発注を確定」。
- Review cart → confirm (note up to 200 characters) → submit as a test order.
- 確定後、受付画面に追跡ID（`G1-YIL-<UUID>`）を表示し、発注書を取得できる。
- After submit, a receipt shows the trace ID and offers the order-output buttons (§8).
- ログアウトでカートは消える。/ Logging out clears the cart.

### 4.4 店舗：履歴 / Store: history
- 自店舗の過去の発注一覧と、各発注の出力ボタン。/ Past orders for this shop with output buttons.

### 4.5 店舗：マイページ（店舗情報）/ Store: My page (shop profile)
- 表示名（40字以内）、担当者名（30字以内）、電話番号（数字・ハイフン・括弧 8〜15字）、店舗画像（PNG・JPEG・WebP、約250KB以下）。
- Display name (≤40), contact name (≤30), phone (digits, hyphens, brackets; 8–15 chars), shop image (PNG, JPEG or WebP; about 250 KB or less).
- 保存後、ヘッダーに表示名が反映される。/ After saving, the header shows the display name.

### 4.6 工場・物流：出荷準備 / Factory and logistics: picking（`FactoryView.js`）
- 絞り込み：拠点（全拠点・各拠点）、状態（未出荷すべて・すべて・受付済み・準備中・出荷済み）。
- Filters: location (all or each), status (open, all, received, preparing, shipped).
- 集計：対象の発注件数、合計数量（品目計）、店舗数。
- Stats: order count, total quantity, number of shops.
- ダウンロード：集計CSV、Excel（集計・明細）、Markdown、明細CSV（配送ルート別）、**発注一式ZIP（店舗別・分析用）**。
- Downloads: summary CSV, Excel (summary and detail), Markdown, detail CSV (by route), **order bundle ZIP (per-store folders, for analysis)**.
- 品目別集計の表（商品コード・商品名・数量・店舗数・拠点）。/ Product summary table.
- 発注ごとのカード：店舗名・ルート・日時・金額・追跡ID・**発注書の出力ボタン（Excel・CSV・Markdown・印刷・共有・メール）**・対応状況の変更。
- Per-order cards: shop, route, time, amount, trace ID, **order-output buttons (Excel, CSV, Markdown, print, share, email)**, and status change.

### 4.7 管理者：マスタ管理 / Admin: master management（`AdminView.js`）
1. 拠点・商品・店舗の各CSVを **ダウンロード（現在の版）**、**空のテンプレート**、**アップロード**。
   Download the current CSV per table, get an empty template, or upload.
2. アップロード後、**下書き**として検証。エラーは「ファイル・行・内容」の表で表示。
   After upload, the file is validated as a draft. Errors show as a table of file, line, and message.
3. エラーが1件でもあれば **「この内容で適用」は無効**。/ If any error exists, **Apply is disabled**.
4. エラーなしで適用 → 直前の版を保持。**1つ前の版に戻す** で一段階戻せる。
   Apply with no errors → previous version is kept. **Roll back one version** restores it.
5. 下書きは現在の版が変わると自動で更新される（ロールバック後も古い下書きを残さない）。
   The draft resets whenever the current version changes, including after rollback.

---

## 5. 機能要件 / Functional requirements

状態 Status: ✅ 実装・テスト済み（ローカル） / ⚠️ 一部 / 📝 計画のみ / ❌ 未着手

| ID | 要件 Requirement | 状態 Status |
|---|---|---|
| FR-LOGIN-01 | 役割別の入口（店舗・工場・管理者）/ Role-based entry | ✅ |
| FR-LOGIN-02 | 店舗検索とアクティブ店舗のみ表示 / Shop search, active shops only | ✅ |
| FR-CAT-01 | 1ページ25件・カテゴリ・キーワード・選択済み絞り込み / 25 per page, filters | ✅ |
| FR-CAT-02 | 数量1〜99（範囲外は拒否）/ Quantity 1–99, out-of-range rejected | ✅ |
| FR-CART-01 | カート保持（ページ移動で消えない）/ Cart survives paging | ✅ |
| FR-ORDER-01 | 発注確定で追跡IDを発行 / Submit issues trace ID | ✅ |
| FR-ORDER-02 | 発注時に店舗名・ルート・単価を **スナップショット保存** / Store name, route and unit prices are snapshotted at order time | ✅ |
| FR-ORDER-03 | 発注履歴（自店舗のみ）/ History (own shop only) | ✅ |
| FR-ORDER-04 | 連絡事項は200字以内 / Note ≤200 characters | ✅ |
| FR-PROFILE-01 | 店舗情報の編集（表示名・担当者・電話・画像）/ Edit shop profile | ✅ |
| FR-PROFILE-02 | 画像はPNG・JPEG・WebPのみ、サイズ上限 / Image types and size limit | ✅ |
| FR-PICK-01 | 拠点・状態で絞り込み、集計・明細を表示 / Filter, summary and detail | ✅ |
| FR-PICK-02 | 集計CSV・Excel・Markdown・明細CSV ダウンロード / Summary and detail downloads | ✅ |
| FR-PICK-03 | 発注ごとの状態変更（受付済み→準備中→出荷済み）/ Per-order status change | ✅ |
| FR-PICK-04 | 発注ごとの出力（Excel・CSV・Markdown・印刷・共有・メール）/ Per-order outputs | ✅ |
| FR-PICK-05 | 発注一式ZIP（店舗別フォルダ＋index.csv＋README）/ Order bundle ZIP | ✅ |
| FR-OUT-01 | 店舗画面の発注書出力（Excel・CSV・Markdown・印刷・共有）/ Store-side output | ✅ |
| FR-OUT-02 | 印刷：発注書の印刷用HTMLを新しいウィンドウで開く / Print via new window | ✅ |
| FR-OUT-03 | 共有：Web Share APIでファイルを送る（対応端末のみ）/ Web Share with files (supported devices) | ⚠️ 端末依存 device-dependent |
| FR-MAIL-01 | メール送信（Markdown・CSV・Excel添付）/ Email with three attachments | ⚠️ 設定後のみ after configuration |
| FR-MAIL-02 | 送信は同じ発注で再試行可能（冪等キー）/ Retry with idempotency key | ✅ |
| FR-MAIL-03 | 送信ボタンは理由を表示して無効化（未設定・アクセスコードなし）/ Disabled with reason | ✅ |
| FR-MASTER-01 | 3種類のCSV（拠点・商品・店舗）の検証（ファイル・行・列の位置付きエラー）/ Validation with precise errors | ✅ |
| FR-MASTER-02 | 不明な列・不足列・列数不一致は拒否（無視しない）/ Unknown or missing columns rejected | ✅ |
| FR-MASTER-03 | エラーがあれば適用不可 / Apply blocked on error | ✅ |
| FR-MASTER-04 | 1つ前の版へ戻す / One-step rollback | ✅ |
| FR-MASTER-05 | 管理者が適用したマスタは、同じブラウザの店舗・工場画面に反映される / Applied master is used by the store and factory screens in the same browser | ⚠️ ブラウザ内のみ（メール確認は未反映）browser-local only; email validation does not yet use it |
| FR-AUTH-01 | 本物の認証（Supabase Auth）/ Real authentication | 📝 |
| FR-AUTH-02 | サーバー側の役割チェック（店舗は自店舗のみ）/ Server-side role checks | 📝 |
| FR-DB-01 | DBに発注・明細・マスタを保存 / Persist orders, items and master in DB | 📝 |
| FR-API-01 | 読み取り専用API（認証必須）/ Read-only API (auth required) | 📝 提案段階 proposal |
| FR-MCP-01 | AIからのMCP接続（認証必須・読み取り）/ MCP for AI (auth, read-only) | 📝 提案段階 proposal |
| FR-SYNC-01 | 端末間の同期 / Cross-device sync | 📝 |

---

## 6. 非機能要件 / Non-functional requirements

| ID | 要件 Requirement | 状態 |
|---|---|---|
| NFR-01 | 日本語UI。金額は円表示（¥、桁区切り）/ Japanese UI, yen with thousands separators | ✅ |
| NFR-02 | スマホ幅（390px）で横スクロールなし / No horizontal page scroll at 390px | ✅（E2E確認 verified） |
| NFR-03 | iPad（タッチ操作）で使える。ボタンは十分な大きさ / Usable on iPad with touch-sized buttons | ⚠️ 実機未確認 not verified on device |
| NFR-04 | コンソールエラーなし / No browser console errors | ✅（E2E確認 verified） |
| NFR-05 | 保存失敗時に画面で通知し、データを壊さない / Storage failures notified, data not corrupted | ✅ |
| NFR-06 | CSVはExcelで開ける（UTF-8 BOM・CRLF）/ CSV opens in Excel (UTF-8 BOM, CRLF) | ✅ |
| NFR-07 | CSV・Excelの数式インジェクションを防ぐ（帳票のみ）/ Formula injection guard on reports | ✅ |
| NFR-08 | 秘密情報はクライアントに出さない / No secrets in client code | ✅ |
| NFR-09 | 本番サーバーへの負荷と認証の要件は本番前に評価する / Load and auth requirements assessed before production | 📝 |

---

## 7. データ定義 / Data definitions

### 7.1 マスタCSV / Master CSV（`lib/master.mjs`）

**拠点 `locations.csv`**

| 列 Column | 説明 Meaning | 規則 Rule |
|---|---|---|
| `location_id` | 拠点ID / Location ID | 英数字・ハイフン・アンダースコア、2〜20字 / Alphanumeric, `-`, `_`; 2–20 chars |
| `name_ja` | 拠点名 / Name | 40字以内 / ≤40 |
| `kind` | 種別 / Kind | `factory` / `stock_room` / `logistics` |

**商品 `products.csv`**

| 列 Column | 説明 Meaning | 規則 Rule |
|---|---|---|
| `product_id` | 商品ID / Product ID | 英数字形式 / ID pattern |
| `name_ja` | 商品名 / Name | 60字以内 / ≤60 |
| `category` | 分類 / Category | 20字以内 / ≤20 |
| `ordering_unit` | 発注単位 / Unit | 10字以内 / ≤10 |
| `unit_price_yen` | 単価（円）/ Unit price (yen) | 0〜1,000,000の整数 / Integer 0–1,000,000 |
| `location_id` | 拠点ID / Location | 既存の拠点IDのみ / Must exist in locations |
| `active` | 有効 / Active | `1`・`0`・`有効`・`無効` |

**店舗 `shops.csv`**

| 列 Column | 説明 Meaning | 規則 Rule |
|---|---|---|
| `shop_id` | 店舗ID / Shop ID | 英数字形式 / ID pattern |
| `name_ja` | 店舗名 / Name | 60字以内 / ≤60 |
| `route_code` | 配送ルート / Route | 20字以内（例 R1）/ ≤20 (e.g. R1) |
| `location_id` | 担当拠点 / Responsible location | 既存の拠点IDのみ / Must exist |
| `active` | 有効 / Active | `1`・`0`・`有効`・`無効` |

**検証の方針 Validation policy:** 1行でも誤りがあれば、ファイル全体を拒否する（部分的な反映をしない）。エラーは「ファイル・行番号・列・内容」で返す。 / If any row fails, the whole set is rejected so partial data never reaches orders. Errors report file, line, column and message.

**既定のマスタ Default master（`lib/master-default.mjs`、生成 generated by `scripts/gen-master.mjs`）:** 拠点4、商品100、店舗150（R1〜R5）、すべて架空。/ 4 locations, 100 products, 150 shops (routes R1–R5), all fictional.

### 7.2 発注 Order object（`lib/catalog.mjs`）

| フィールド Field | 説明 Meaning |
|---|---|
| `id` | UUID（発注の一意ID）/ Unique order UUID |
| `traceId` | `G1-YIL-<id>`（追跡ID）/ Trace ID |
| `storeId`, `storeName`, `routeCode` | 発注時点の店舗情報（スナップショット）/ Shop info at order time |
| `lines[]` | 商品コード・商品名・分類・単位・単価・locationId・数量 / Product, unit price, location, quantity |
| `total` | 合計（円）/ Total (yen) |
| `note` | 連絡事項（200字以内）/ Note |
| `createdAt` | 作成日時（ISO 8601、表示はJST）/ Created (ISO; displayed in JST) |
| `status` | `受付済み` → `準備中` → `出荷済み` / Received → Preparing → Shipped |

### 7.3 ブラウザ保存キー / Browser storage keys（`lib/storage.mjs`、デモ専用 demo only）

| キー Key | 内容 Content |
|---|---|
| `yamada-sample-orders-v1` | 発注一覧 / Orders |
| `yamada-master-csv-v1` | 現在のマスタCSV / Current master CSV |
| `yamada-master-csv-prev-v1` | 1つ前のマスタCSV / Previous master CSV |
| `yamada-shop-profiles-v1` | 店舗情報（店舗ID別）/ Shop profiles by shop ID |

### 7.4 Supabase 設計（参照のみ・未適用）/ Supabase design (reference only, not applied）

スキーマ `yil_sample`（`supabase/migrations/202610300001_sample.sql`）:
- `stores(id, name)`、`products(id, name, category, unit, price)`
- `memberships(user_id, store_id, role)`：role は `store` / `hq` / `factory`。`store` は店舗ID必須。
- `orders(id, store_id, created_by, trace_id, created_at, status, note)`：status は3値、note は200字以内。
- `order_items(order_id, product_id, quantity)`：数量は1〜99。
- RLS：本人のメンバーシップのみ参照可。店舗は自店舗、`hq`・`factory` は全件参照。クライアントからの書き込みは許可しない。
- RLS: members see only their own membership. Stores see their own store; `hq` and `factory` see all. No client writes.

**状態 Status:** 作成済み・未適用・リモート未確認。承認なしに適用しない。/ Authored, not applied, remote not inspected. Not applied without approval.

---

## 8. 発注書の出力 / Order outputs

| 形式 Format | 中身 Contents | 備考 Notes |
|---|---|---|
| Markdown（`.md`） | 見出し・発注情報・表・合計・連絡事項 / Heading, details, table, total, note | UTF-8。記号はHTML的に安全化 / UTF-8, escaped |
| CSV（`.csv`） | 追跡ID・日時・店舗・状態・商品・数量・単価・小計・合計・備考 | UTF-8 BOM・CRLF・全項目を引用符で囲む / UTF-8 BOM, CRLF, quoted fields |
| Excel（`.xlsx`） | 発注書シート・数量は数値・小計と合計は数式（キャッシュ値付き）/ Sheet with numeric quantities and formulas | 固定日時のZIPで同じ入力は同じ出力 / Stable timestamps so repeats are identical |
| 印刷 Print | 発注書の印刷用HTML（新しいウィンドウ）/ Print-ready HTML in a new window | 値はすべてHTMLエスケープ / All values escaped |
| 共有 Share | 3形式のファイルを共有シートへ / Three files to the share sheet | 対応端末のみ / Supported devices only |
| メール Email | 件名「【テスト発注】店舗名 / 追跡ID」、本文、3ファイル添付 / Subject, text body, three attachments | §9 |

**ファイル名 File name:** `yamada-order-<店舗ID>-<発注UUID>.<拡張子>`（英数字のみ）。/ Alphanumeric only.

**工場・物流 ZIP（`orders/` 構成）/ Logistics ZIP layout:**
```
orders/<店舗ID>/yamada-order-<店舗ID>-<UUID>.md|csv|xlsx
index.csv        追跡ID・日時・店舗ID・店舗名・ルート・状態・合計・明細行数
README.txt       説明（テストデータ）
```
ZIPは画面の絞り込み（拠点・状態）に従う。/ The ZIP follows the on-screen filters (location, status).

---

## 9. メール送信 / Email（`app/api/order-email/route.js`、`lib/order-email.mjs`）

**設定（サーバー専用・Vercel Previewのみ）/ Settings (server-only, Vercel Preview only)**

| 変数 Variable | 意味 Meaning |
|---|---|
| `RESEND_API_KEY` | 送信APIキー（値は文書に書かない）/ Sending key (value never written here) |
| `ORDER_EMAIL_FROM` | 認証済み送信元 / Verified sender |
| `ORDER_EMAIL_TO` | 固定の宛先（画面から変更不可）/ Fixed recipient (not changeable on screen) |
| `ORDER_EMAIL_ACCESS_CODE` | 20字以上の送信用コード / Access code, ≥20 chars |

**エンドポイント規則 Endpoint rules**
- `GET`：有効かどうかだけ返す（値は返さない）/ Returns only whether enabled.
- `POST`：同一オリジンのみ、JSONのみ、64KB以下、アクセスコードは定数時間比較、商品・数量・価格はサーバーで再計算、冪等キーで二重送信防止。
- `POST`: same origin only, JSON only, ≤64 KB, access code compared in constant time, prices and quantities recomputed on the server, idempotency key prevents double sends.
- 成功は「受付」と表示（受信箱到着の保証ではない）/ Success means accepted by the provider, not inbox-delivered.
- 失敗しても発注は保存済み。同じ発注から再試行できる。/ Failure never discards the saved order; retry uses the same order UUID.

**既知の制約 Known limits**
- 送信の永続的な台帳はない（プロバイダの重複排除期間のみ）。本番前に必要。/ No durable sent ledger yet (provider dedupe window only). Needed before production.
- 認証はデモPINのみ。アクセスコードは本人認証ではない。/ Authentication is demo PIN only.
- メール確認はサーバーの既定マスタで行う。管理者が追加した店舗・商品はまだ送れない。/ Email validation uses the server's default master, so shops and products added by admin cannot be emailed yet.

---

## 10. 業務ルール / Business rules

| ID | ルール Rule |
|---|---|
| BR-01 | 数量は整数で1〜99。0は「未選択」として扱い、発注に含めない。/ Integer 1–99. Zero means not selected. |
| BR-02 | 発注には1品目以上が必要。/ At least one item required. |
| BR-03 | 無効な店舗・商品・拠点は発注・選択できない。/ Inactive shops, products or locations cannot be ordered. |
| BR-04 | 単価・店舗名・ルートは発注時点の値を保存する（マスタ変更で過去の発注は変わらない）。/ Price, shop name and route are snapshotted. |
| BR-05 | 状態は `受付済み` → `準備中` → `出荷済み` の順（画面は任意の状態へ変更可・将来は順序を強制）。/ Status order. Screen currently allows any change; enforce order in production. |
| BR-06 | 連絡事項は200字以内。/ Note ≤200 chars. |
| BR-07 | 金額は円の整数。税計算は行わない（参考表示）。/ Yen integers. No tax calculation; totals are reference only. |
| BR-08 | 帳票（CSV・Excel）の先頭が `=` `+` `@` `-` の値は文字として扱う（数式にしない）。/ Report cells starting with `= + @ -` are neutralized. |

---

## 11. セキュリティとプライバシー / Security and privacy

| 項目 Item | 現在 Current（デモ） | 本番で必要 Required for production |
|---|---|---|
| 認証 Auth | PIN（デモ）/ Demo PIN | Supabase Auth（本人確認）/ Real login |
| 権限 Authorization | 画面の表示のみ / UI only | サーバー・DB側（RLS）/ Server and RLS |
| データ保存 Storage | ブラウザ内（端末ごと）/ Browser only | DB、トランザクション / DB with transactions |
| 秘密情報 Secrets | 環境変数（サーバーのみ）/ Server env only | 秘密管理サービス / Managed secret store |
| 監査 Audit | 追跡IDのみ / Trace ID only | 操作ログ・誰が何を変えたか / Action log |
| 個人情報 Personal data | 入れない / Must not enter | 承認後のみ、最小限 / Only after approval, minimal |
| 公開範囲 Exposure | 公開しない（プレビュー）/ Preview only | API公開設定の審査 / Review before API exposure |

**注意 Warning:** 現在の画面では、誰でも全店舗の発注を見られる（デモのため）。実データは絶対に入れない。/ Anyone with the demo can see all stores' orders. Never enter real data.

---

## 12. API と MCP（提案段階）/ API and MCP (proposal stage)

**日本語**
AIが発注データを読めるようにするための提案です。**まだ作らない。承認後に作る。**
- 読み取り専用。書き込みは対象外。
- Supabase Authで認証し、サーバー側で役割を確認する（店舗は自店舗のみ）。
- 未認証で発注データは出さない。
- 形式は §8 の出力（Markdown・CSV・Excel・ZIP）を流用する。
- 監査ログを残す。

**English**
A proposal so AI can read order data. **Not built yet. Build only after approval.**
- Read-only. No writes.
- Authenticated with Supabase Auth; roles checked on the server (stores see only their own shop).
- No unauthenticated order data.
- Reuse the §8 formats (Markdown, CSV, Excel, ZIP).
- Keep an audit log.

**想定の使い道 Intended use:** フォルダやメールの添付ファイルを、エージェントが読んで分析・確認する。/ An agent reads files from a folder or email attachments to analyse and check them.

---

## 13. アーキテクチャと構成 / Architecture and code map

**技術 Stack:** Next.js 16.4.3（App Router、ビルドは `next build --webpack`）、React 19.3.1、pnpm、Node 22系（README は 20.9 以上と記載、要更新）、exceljs 4.4.0、jszip 3.10.1、Resend（メール）。
/ Next.js 16.4.3 (App Router, built with `next build --webpack`), React 19.3.1, pnpm, Node 22 (README says 20.9+ and needs updating), exceljs, jszip, Resend.

| パス Path | 役割 Role |
|---|---|
| `app/page.js` | 画面の親。ログイン、マスタ・発注・店舗情報の状態、メール送信、発注書ボタンの配線 / Root: login, state, email, output wiring |
| `app/components/StoreView.js` | 店舗：商品・カート・確認・受付・履歴・マイページ / Store screens |
| `app/components/CatalogList.js` | 商品一覧（25件/ページ）/ Catalog list |
| `app/components/FactoryView.js` | 工場・物流：集計・ダウンロード・発注ごとの状態 / Factory and logistics |
| `app/components/AdminView.js` | 管理者：CSV検証・適用・ロールバック / Admin master |
| `app/components/OrderActions.js` | 発注書ボタン（Excel・CSV・Markdown・印刷・共有・メール）/ Order-output buttons |
| `app/api/order-email/route.js` | メール送信API / Email API |
| `app/ops.css`, `app/globals.css` | 画面のスタイル / Styles |
| `lib/catalog.mjs` | 既定マスタ、カート→発注、スナップショット / Default master, cart → order |
| `lib/master.mjs` | マスタCSVの定義・検証・出力 / Master CSV spec, validation, serialize |
| `lib/master-default.mjs` | 既定マスタ（生成物）/ Default master (generated) |
| `lib/csv.mjs` | CSVの読み書き（BOM・引用符・数式防止）/ CSV parse and write |
| `lib/order-exports.mjs` | 発注のCSV・Markdown・テキスト・Excel / Order exports |
| `lib/order-print.mjs` | 印刷用HTML（値のエスケープ）/ Print HTML |
| `lib/order-bundle.mjs` | 発注一式ZIP / Order bundle ZIP |
| `lib/order-email.mjs` | メールの検証・送信・添付 / Email validation, send, attachments |
| `lib/picking.mjs` | 出荷の集計・明細 / Picking summary and detail |
| `lib/shop-profile.mjs` | 店舗情報の検証 / Shop profile validation |
| `lib/storage.mjs` | ブラウザ保存（キーと安全な読み書き）/ Browser storage |
| `scripts/gen-master.mjs` | 既定マスタを生成 / Generates default master |
| `scripts/seed.mjs`, `supabase/` | Supabase用の架空データとスキーマ（未適用）/ Fictional seeds and schema (not applied) |
| `tests/*.test.mjs` | 単体テスト / Unit tests |
| `08_AI_HANDOVERS/` | 引継ぎ記録 / Handover records |
| `AGENTS.md` | Next.js 16 の注意事項（既存の文書を参照）/ Next.js 16 guidance (keep as is) |

---

## 14. テストと検証 / Testing and verification

| 種類 Type | 内容 Content | 現在 Current |
|---|---|---|
| 単体テスト Unit | CSV・マスタ検証・出荷集計・店舗情報・発注書・印刷・ZIP / CSV, master, picking, profile, exports, print, bundle | **41 件 通過 / 41 pass** |
| ビルド Build | `pnpm build` | ✅ 通過 / pass |
| E2E（本体）| 店舗発注・マイページ・工場Excel・不正CSVの拒否・正しいCSVの適用・ロールバック・390px・コンソールエラー | **11 / 11 通過** |
| E2E（発注書ボタン）| 店舗：Excel・CSV・Markdown・印刷・共有の表示と保存；工場：ZIP・店舗ごとのExcel・メール・CSV | **13 / 13 通過** |

**実行方法 How to run**
```bash
pnpm install --frozen-lockfile
pnpm test          # 単体テスト / unit tests
pnpm build         # 本番ビルド / production build
pnpm start -p 3210 # ローカル確認 / local check
```
E2Eはローカルの本番サーバーに対して実行する（スクラッチパッドのスクリプト）。/ E2E runs against the local production server using scratchpad scripts (not in the repo yet).

**未確認 Not yet verified:** 実機のiPad・iPhoneでの共有・印刷・ダウンロード。/ Real iPad and iPhone checks for share, print and download.

---

## 15. 実行と公開 / Running and publishing

- 開発：`pnpm dev`（http://localhost:3000）/ Dev server.
- 公開先：Vercel のPreviewのみ。本番（Production）には出さない。/ Vercel Preview only. No production release.
- 公開前に必要：本物の認証、DB、送信台帳、承認。/ Before any wider release: real auth, DB, send ledger, approval.
- Vercelの自動デプロイは、この作業では無効のまま。/ Automatic deploys stay disabled for this work.

---

## 16. 既知の課題とリスク / Known gaps and risks

| ID | 課題・リスク Issue / risk | 対応 Action | 優先度 Priority |
|---|---|---|---|
| R-01 | ブラウザ保存のみ。端末間で共有されない。/ Browser-only storage, no sharing. | DB化（FR-DB-01） | 高 High |
| R-02 | 認証がデモPIN。/ Demo PIN auth. | Supabase Auth（FR-AUTH） | 高 High |
| R-03 | 管理者の変更がメール確認に反映されない。/ Admin changes not used by email validation. | DB化の後にサーバーで同じマスタを参照 | 高 High |
| R-04 | 送信の永続台帳がない。/ No durable send ledger. | DBに送信記録 | 中 Medium |
| R-05 | 共有は端末依存。/ Share depends on device. | 実機確認、代替はダウンロード | 中 Medium |
| R-06 | README が古い（5店舗・Node 20.9+ と記載）。/ README is stale (says 5 shops, Node 20.9+). | 次の版で修正 | 低 Low |
| R-07 | 追跡ID方式は暫定。Genesis ONE の正式規則は未確認。/ Trace ID scheme is provisional; Genesis ONE conventions not confirmed. | 規則の承認（§18） | 中 Medium |
| R-08 | 状態変更の順序を画面で強制していない。/ Status order not enforced on screen. | BR-05 の実装 | 低 Low |
| R-09 | 画像は端末内に保存される（サイズは約250KB上限）。/ Images stored in browser storage. | 本番では保存先を決める | 低 Low |
| R-10 | Supabase のリモートは未確認・未適用。/ Remote Supabase not inspected or applied. | 承認後に検証環境で確認 | 中 Medium |

---

## 17. ロードマップ / Roadmap

| フェーズ Phase | 内容 Content | 前提 Gate |
|---|---|---|
| **P0（現在 now）** | サンプル完成：発注・出荷・マスタ・出力・テスト / Sample complete | — |
| **P1** | この設計書の承認、下書きブランチへのpush、Preview公開 / Approve this blueprint, push draft, Preview | 人の承認 Human approval |
| **P2** | ローカルSupabaseで検証（認証・RLS・トランザクション）/ Local Supabase validation | 承認 Approval |
| **P3** | 認証とDB化、送信台帳、管理者マスタのサーバー反映 / Auth, DB, send ledger, server-side master | P2 完了 |
| **P4** | 読み取りAPI・MCP（認証必須）/ Read-only API and MCP | P3 完了＋承認 |
| **P5** | 実データの検討（別途承認）/ Real data (separate approval) | 全件承認 Full approval |

---

## 18. 未決事項 / Open decisions（人が決める / for humans to decide）

1. `main` にある1件のコミット（vercel.json）を残すか戻すか。/ Keep or revert the single commit on main (vercel.json).
2. 機能ブランチを下書きとしてpushしてよいか。/ Push the feature branch as a draft?
3. 個人のMDファイル体系を別の非公開リポジトリにするか。/ Keep the personal MD system in a separate private repo?
4. 追跡IDと引継ぎの番号規則（Genesis ONE）の確定。/ Confirm the trace ID and handover numbering scheme.
5. 送信先の運用（誰が受け取るか、アクセスコードの管理者）。/ Who receives emails and who holds the access code.
6. P2 に進むかどうか。/ Whether to start P2.

---

## 19. 用語集 / Glossary

| 日本語 Japanese | English | 意味 Meaning |
|---|---|---|
| 発注（はっちゅう） | Order | 店舗が必要な商品を注文すること / A shop ordering goods |
| 出荷（しゅっか） | Shipment / Picking | 工場・物流が商品を用意し送ること / Preparing and sending goods |
| 集計（しゅうけい） | Summary / Aggregation | 同じ商品の数量を合計すること / Totals of the same product |
| 明細（めいさい） | Detail | 1件ごとの内訳 / Line-by-line breakdown |
| 拠点（きょてん） | Location | 工場・倉庫・物流センター / Factory, stock room, logistics centre |
| 配送ルート（はいそう・ルート） | Route | 店舗へ届ける順路（R1〜R5）/ Delivery route (R1–R5) |
| マスタ（ますた） | Master data | 商品・店舗・拠点の基本データ / Core reference data |
| 下書き（したがき） | Draft | 適用前の内容 / Not yet applied |
| 適用（てきよう） | Apply | 下書きを有効な版にすること / Make a draft the live version |
| ロールバック（ろーるばっく） | Rollback | 1つ前の版に戻すこと / Return to the previous version |
| 追跡ID（ついせきID） | Trace ID | 発注を一意に追う番号 / Unique tracking number |
| 架空データ（かくうデータ） | Fictional data | 実在しない、テスト用の情報 / Made-up test information |
| 承認（しょうにん） | Approval | 人が内容を認めること / A human agrees |
| 下書きブランチ（したがき・ブランチ） | Draft branch | 本番に入らない作業用の枝 / Work branch not released |

---

## 20. 関連文書 / Related documents

- `README.md`（実行方法・概要。§14 と §16 で更新が必要）/ Run notes (needs update per §16 R-06)
- `08_AI_HANDOVERS/G1-YIL-20261030-001.md`、`08_AI_HANDOVERS/G1-YIL-20261102-003-list-exports.md`
- `AGENTS.md`（Next.js 16 の注意事項）/ Next.js 16 notes
- `supabase/migrations/202610300001_sample.sql`、`supabase/seed.sql`

---

## 21. 変更履歴 / Change log

| 版 Version | 日付 Date | 変更 Change |
|---|---|---|
| v0.1 | 2026-11-02 | 発注・出荷・マスタの最初のサンプル（G1-YIL-20261102-003）/ First sample with ordering, picking, master |
| v0.2 | 2026-11-04 | 本設計書を作成。発注書の出力（Excel・CSV・Markdown・印刷・共有・メール）、工場の発注ごとの出力、発注一式ZIP を追加。単体テスト41件、E2E 11＋13件を確認。/ Created this master. Added order outputs, per-order outputs for factory, order bundle ZIP. 41 unit tests, 11+13 E2E checks. |
