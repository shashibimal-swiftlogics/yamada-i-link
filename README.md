# Yamada i link — sample ordering

Japanese Next.js application with 5 fictional stores and 100 fictional products. Demo PIN: **1234**. Login is a demo selector, not secure authentication. Orders are saved only in this browser's localStorage; all demo users can access the mock HQ view. Do not enter personal or production data. No Supabase network calls are made.

## Run

Node 20.9+; `pnpm install --frozen-lockfile`, `pnpm dev`, then open http://localhost:3000. `pnpm test` runs order validation tests; `pnpm build` creates a production build; `pnpm start` serves it.

## Sample workflow

Choose a store and PIN 1234 → search/filter products → quantities 0–99 → cart → confirmation → submit → history. Factory/HQ demo shows this browser's orders, aggregates unshipped quantities, and changes mock fulfillment status. Logging out clears the cart. Reload retains orders. No actual purchase, delivery, tax calculation, or cross-device sync.

## Supabase boundary

Target reference (not linked or deployed): `ankykvukgihcehzmgowe`. Migration in `supabase/migrations` creates a separate `yil_sample` schema, authenticated membership-based SELECT policies, and no client writes. Seeds contain fictional data only. Neither remote schema nor existing auth was inspected or changed. Never expose service-role keys. Before integration: use a disposable local Supabase instance, test policies with two stores and HQ/factory accounts, then implement transactional order submission and price snapshots. Provision memberships administratively, use real Supabase Auth, and keep the sample schema out of API exposed schemas until tested. Do not apply these files to the remote project without explicit approval.

## Traceability

See `08_AI_HANDOVERS/G1-YIL-20261030-001.md`. Each demo order carries `G1-YIL-<UUID>`. Exact Genesis ONE conventions were not available in the referenced conversation; this is a provisional trace scheme, not claimed certification.
