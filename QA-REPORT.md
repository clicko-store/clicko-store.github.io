# Clicko QA / Security Report — 2026-11-07

## Scope
Static storefront (`index.html`), product Admin (`admin.html`), orders and costs Admin (`orders.html`), Supabase project `mvpxjkpnlopgitvvzsyc`.
This is a verified source-code, mocked-client and SQL transaction test report, **not** a completed real-device/browser acceptance test.

## Passed
- All inline JavaScript blocks compiled without syntax errors (6 storefront, 1 Admin, 1 orders).
- GitHub source has required navigation from Admin to orders.
- SQL transaction: insert temporary product -> reserve -> mark sold -> insert cost -> insert order -> mark paid and tracking -> assertions; transaction rolled back.
- After rollback: **154 products**, **131 available**, **0 reserved**, **23 sold**, **0 orders**, **0 costs**. Zero temporary test records; zero stock/legacy sold flag conflicts.
- Public (`anon`) role: reads product catalog but cannot update products, read private costs, or read orders.
- Non-admin `authenticated` role (no valid admin user claim): denied private order/cost reads and inserts.
- Client inventory unit tests: verified available SKU can order; reserved/sold/non-verified SKU cannot; legacy sold fallback works.
- Sales math unit tests: paid/shipped revenue only; pending excluded; incomplete cost excluded from profit; known/total count displayed.
- Mock Admin order-form submission: 1200.29 price + 50 shipping + 20 expenses retained; empty sale price blocked.
- Payment validation unit tests: 0, 0.29 and 1200.30 accepted; blank, negative, invalid and >2 decimal figures rejected.
- Fixed malformed inline product image error handler to use existing safe error listener.
- Verified no `service_role` or secret key in `supabase-config.js`.

## Source commits
- Storefront image fallback repair: `5f82c800c8a84f2dee43f0df02634a99c0888e42`
- Finance amount validation repair: `96440d629471383c4e688cacc5fb8d5398807129`

## Outstanding / requires authorized real-world interaction
- Login, product save/photo upload, Messenger link/open/copy, order insert/update through the deployed pages on a **real mobile/desktop browser** have not been validated with the store owner's account.
- GitHub Actions checks for the latest commit returned no workflow runs/status checks. GitHub Pages deployment and end-user performance were not independently verified.
- Messenger does not automatically send messages; buyers copy and paste. Opening Messenger is not order/payment confirmation.
- The order dashboard currently reports paid/shipped orders **created in the displayed month**; payment date is not separately recorded.
- Order and stock updates are **not yet atomic/automatically synchronized**. Update stock separately after confirmation.
- The Supabase Security Advisor warns **Leaked Password Protection Disabled**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Storefront and Admin
- https://knbowpani-wq.github.io/clicko-store/
- https://knbowpani-wq.github.io/clicko-store/admin.html
- https://knbowpani-wq.github.io/clicko-store/orders.html

No real product data, payment, stock or customer order was altered during QA.
