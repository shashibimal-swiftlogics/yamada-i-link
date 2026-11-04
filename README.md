# Yamada i link — sample ordering

Japanese Next.js application with 5 fictional stores and 100 fictional products. Demo PIN: **1234**. Login is a demo selector, not secure authentication. Orders are saved only in this browser's localStorage; all demo users can access the mock HQ view. Do not enter personal or production data. No Supabase network calls are made.

## Run

Node 20.9+; `pnpm install --frozen-lockfile`, `pnpm dev`, then open http://localhost:3000. `pnpm test` runs order validation tests; `pnpm build` creates a production build; `pnpm start` serves it.

## Sample workflow

Choose a store and PIN 1234 → search/filter the paginated product list → quantities 0–99 → cart → confirmation → submit → history. The list shows 25 rows per page and can show only selected products. Selected quantities survive page/filter changes. Factory/HQ demo shows this browser's orders, aggregates unshipped quantities, and changes mock fulfillment status. Logging out clears the cart. Reload retains orders. No actual purchase, delivery, tax calculation, or cross-device sync.

Orders can be downloaded from the receipt, history, or HQ view as Markdown, UTF-8 BOM CSV, and native XLSX. Files contain the store, JST timestamp, trace ID, lines, quantity, prices, total, and notes. CSV escapes quotes/newlines and neutralizes formula prefixes. XLSX includes numeric quantities and cached total formulas.

## Automatic order email (optional; disabled until configured)

Set the server-only variables from `.env.example` in the Vercel **Preview** environment: a Resend sending API key, verified sender address, fixed recipient, and a random access code of at least 20 characters. Keep recipient addresses and credentials in private deployment settings, not this repository. Never place API keys in chat, source, or NEXT_PUBLIC variables. A private sending code is required because public demo PIN 1234 is not authentication. Enter that code on the confirmation screen; after the order saves locally, the app automatically submits email with MD, CSV and XLSX attachments. The website never lets the caller choose a different recipient. Historical orders can be retried with the same order UUID.

The sending endpoint bounds request size, validates products/quantities, calculates prices on the server, requires a same-origin request and private sending code, and uses Resend's order-specific idempotency key. The provider's deduplication window is not a durable permanent sent ledger. A provider acceptance response is shown as accepted, not inbox-delivered. Failed email does not discard the locally saved order. Without all settings, downloads remain usable and the UI explicitly says automatic email is not configured. No real email has been sent during implementation; provider calls were mocked in tests. Use real account-based authorization and a durable send ledger before production rollout.

## Supabase boundary

Target reference (not linked or deployed): `ankykvukgihcehzmgowe`. Migration in `supabase/migrations` creates a separate `yil_sample` schema, authenticated membership-based SELECT policies, and no client writes. Seeds contain fictional data only. Neither remote schema nor existing auth was inspected or changed. Never expose service-role keys. Before integration: use a disposable local Supabase instance, test policies with two stores and HQ/factory accounts, then implement transactional order submission and price snapshots. Provision memberships administratively, use real Supabase Auth, and keep the sample schema out of API exposed schemas until tested. Do not apply these files to the remote project without explicit approval.

## Traceability

See `08_AI_HANDOVERS/G1-YIL-20261030-001.md`. Each demo order carries `G1-YIL-<UUID>`. Exact Genesis ONE conventions were not available in the referenced conversation; this is a provisional trace scheme, not claimed certification.
