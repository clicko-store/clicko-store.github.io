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
- **Superseded:** Orders and inventory became atomic after the 2026-11-07 database migration (see the section below).
- The Supabase Security Advisor warns **Leaked Password Protection Disabled**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Storefront and Admin
- https://knbowpani-wq.github.io/clicko-store/
- https://knbowpani-wq.github.io/clicko-store/admin.html
- https://knbowpani-wq.github.io/clicko-store/orders.html

No real product data, payment, stock or customer order was altered during QA.

## Atomic order ↔ inventory follow-up — 2026-11-07

Implemented at database level via private-schema SECURITY INVOKER triggers and a partial unique index, and connected to the Admin Orders UI.

### Inventory transitions
- Create pending order → SKU reserved, legacy sold=false
- Confirm paid → SKU sold, legacy sold=true
- Paid → shipped → remains sold
- Cancel pending or paid before shipping → SKU available (refund, if required, must be handled separately)
- Shipped/cancelled orders are terminal; cannot automatically restock a shipped item
- Pending → shipped is rejected; payment must be confirmed first
- A duplicate active order for the same SKU is rejected by a unique partial index and row-level lock
- Direct Admin product stock updates are rejected when inconsistent with an existing active order
- Orders cannot be physically deleted; the source is retained for audit

### Validation performed
- PostgreSQL BEGIN/ROLLBACK as simulated authorized Admin: create QA SKU, insert order, observe reservation, transition paid, observe sold, attempt direct shipped, pending→shipped, duplicate pending order and shipped→cancelled (rejected), then ROLLBACK
- Additional rollback scenario: pending → paid → cancelled returns stock to available; a new order can reserve again
- All storefront/Admin/Orders inline JavaScript passed syntax checks
- Database unchanged afterwards: 154 products (131 available, 0 reserved, 23 sold), 0 real orders/cost records inserted for testing, 0 QA remnants and 0 inconsistent sold flags
- Supabase advisors: performance warnings none, security still reports leaked password protection disabled

### Limitations / important business rules
- No Messenger or bank payment API confirms payments automatically. **Only the Admin selecting “paid”** constitutes a payment confirmation inside Clicko.
- Moving a paid order to “cancelled” releases its stock but does not perform a financial refund. Admin must check the real refund manually.
- Orders already shipped cannot be returned to available by order cancellation. Returned merchandise requires a separate inspected manual process.
- Live click-through tests on the owner’s authenticated browser remain outstanding.
- Existing products sold before the order system existed remain “sold” with no historical order; no synthetic orders are created.

## Final hardening / gallery / backup / reminders — 2026-11-07

### Delivered on GitHub
- `index.html`: Clicko storefront loads publicly readable secondary photos from `clicko_product_photos`, displays clickable thumbnails in detail view, uses first uploaded photo as a card thumbnail when the main image is blank, preserves older relative local photo URLs.
- `admin.html`: Admin-controlled upload of up to 8 additional real product images (JPEG/PNG/WEBP up to 5 MB each), manages gallery metadata; removes self-registration UI, preserves original Admin login and product functions.
- `orders.html`: Pending reservations show age, number older than 24h and 48h, and an in-app list filter. Nothing auto-cancels.
- `backup.html`: Requires Admin authorization; downloads JSON of products, orders, private costs and secondary photo metadata from current Supabase tables. Validates a backup before comparing it. Non-destructive restore can insert *missing* products, costs and photo metadata, but never overwrites existing records and never replays historical orders.
- `tests/verify.mjs` and `.github/workflows/clicko-qa.yml`: source-level regression tests configured for GitHub Actions on push and pull request. Actions run result not independently verified during this task.
- Automation: Daily 08:00 Asia/Bangkok watch checks `clicko_orders` for pending orders over 24 hours. It will attempt to notify only when overdue, without customer/cost details or stock mutations.

### Supabase and QA
- New `public.clicko_product_photos` table with RLS. Public may read photo URLs; only a recognized Admin may write metadata. Existing Storage bucket accepts public reads and Admin-only uploads.
- An authorized Admin simulation inside BEGIN/ROLLBACK inserted and removed one QA photo, verified duplicate position and out-of-range position were rejected, then rolled back.
- Backup JS comparison tests: identical backup => no restore enabled, missing SKU detected, malformed stock state rejected.
- Pending notification test: an overdue pending order is detected but a paid order is not.
- All 4 pages' inline JS parsed successfully. Separate static regression checker passed its authored source guards; GitHub Actions execution is pending independent confirmation.
- Final DB audit after rollback: 154 products; 131 available, 0 reserved, 23 sold; 0 orphaned QA rows, 0 order/cost/photo test records; 0 legacy sold-flag inconsistencies.
- Public anonymous access cannot read orders or costs, nor modify photo metadata.
- Supabase Security Advisor: one outstanding **Leaked Password Protection Disabled** notice: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

### Explicit limitations / do not overclaim
- JSON download is an on-demand, admin-initiated backup. It is not a scheduled off-site database backup, PITR, or a full disaster-recovery restore. JSON does not contain image *file bytes*, only image URL metadata.
- Missing-record recovery uses sequential inserts and can partially complete if network access fails. It never overwrites existing records, and historical orders are not auto-restored to avoid conflicting with atomic inventory triggers.
- Reminders have been scheduled, but the first remote connector-enabled scheduled run has **not** been observed.
- Real mobile browser Auth, photo file selection/upload, Messenger deep-link behavior, and real bank-payment confirmation are not independently end-to-end verified. Admin action marks payment paid; no bank API is linked.
- Password protection configuration may require an action in the Supabase Dashboard or plan eligibility; it cannot be changed by the current connector.

## Daily internal SQL snapshots — 2026-11-07

- Created private table `clicko_private.backup_snapshots` protected from `anon` and `authenticated` roles.
- Captured baseline snapshot of 154 products with order/cost/gallery metadata and Admin identifiers. No customer data was published to GitHub.
- Enabled Supabase Cron (`pg_cron`) to call `clicko_private.take_daily_backup()` at 20:00 GMT = 03:00 Asia/Bangkok each day. Job `clicko-daily-private-snapshot` verified active, and a manual invocation of the same SQL function succeeded.
- Scheduled snapshots expire after 30 days. The manual baseline snapshot remains for disaster investigation unless explicitly removed.
- Verified unauthenticated and normally authenticated roles have no EXECUTE access to the private backup function and no access to the private snapshot schema or table.
- **Important:** This is an automated *same-database* snapshot for accidental changes, not a separate disaster-recovery copy. A complete Supabase project/database loss could also destroy the snapshots. The Admin JSON download remains the means to create a copy stored outside Supabase; physical image file bytes are not included in JSON.
- The first **scheduled** 03:00 run had not yet occurred when this report was written, although the function was manually tested successfully.

## Additional hardening — reversible product hide and Storage RLS

- Made product removal reversible: new `clicko_products.is_hidden` (default false), Admin hide/unhide UI, hidden filter, storefront excludes hidden products and denies ordering, Orders form excludes hidden SKUs.
- Existing products were not deleted. Admin editor now preserves `created_at` and `is_hidden` when updating existing SKUs.
- Extended `clicko_private.sync_order_inventory()` to reject creating orders for hidden SKUs while allowing an already-open order to advance from pending to paid when the product is subsequently hidden.
- BEGIN/ROLLBACK as recognized Admin passed: hidden product cannot be ordered; unhide permits reservation; hide an existing reserved product then confirm paid; database updates to sold; all rolled back.
- Audited `storage.objects` RLS: discovered existing Admin-only upload and public-read policies, removed redundant new policies; retained explicit Admin-only object UPDATE policy.
- BEGIN/ROLLBACK RLS tests: anon upload denied, authenticated non-admin upload denied, simulated authorized Admin upload allowed. No Storage test rows persist.
- Updated `tests/verify.mjs` to assert no archived products can be ordered or displayed, Admin provides reversible hide, and backup restore retains archived flag.
- Post-change live DB counts: 154 products, 131 available, 0 reserved, 23 sold, 0 hidden, 0 inconsistent flags, 0 QA residue.
- Supabase advisors after updates: no performance lints; leaked-password protection disabled warning remains. CI workflow is configured; independently observed successful GitHub Actions execution remains pending.

## Launch hardening continuation — 2026-11-07 evening

### Fixed and verified
- Restricted public Supabase API `clicko_products` SELECT to non-hidden products only. Authenticated non-admin sees visible products only; authenticated Admin can still read archived items.
- Restricted secondary `clicko_product_photos` public reads to photos belonging to visible products; Admin still reads hidden-product galleries. Note: pre-existing public Storage image URLs remain reachable to someone holding the URL.
- Consolidated select RLS policies for products/photos after Supabase Performance Advisor flagged multiple permissive policies. Re-ran Performance Advisor: **zero findings**.
- Tested with temporary hidden product + photo inside SQL BEGIN/ROLLBACK under anonymous, ordinary authenticated and authorized Admin roles. Hidden item and photo were inaccessible to public/non-admin, visible to Admin, then rolled back.
- Confirmed image Storage insert is denied to unauthenticated/non-admin and permitted to Admin in isolated rollback tests; redundant policies removed to avoid confusion.
- `backup.html` now orders every table deterministically before ranged pagination, reducing duplicates/omissions when exporting larger catalogs.
- `admin.html` updates `updated_at` when saving changes, rejects malformed/negative prices, and distinguishes saved product data from incomplete secondary photo uploads.
- Outstanding: enabling leaked-password detection in Supabase Auth requires an eligible plan/dashboard action; real authenticated mobile/browser checkout and photo file uploads remain unverified. GitHub workflow source is present but its successful hosted execution was not independently observed.

## Release-readiness audit — 2026-11-07

### Changes made during audit
1. **Authoritative catalog:** When live Supabase query succeeds, storefront filters the legacy embedded/Sheet catalog to SKUs actually returned by Supabase. Archived/deleted/ghost SKUs cannot reappear as customer cards solely from outdated embedded data.
2. **Permanent deletion disabled:** Removed `DELETE` grant and policy from `public.clicko_products` for authenticated users. Existing Admin can still update and non-destructively hide products. Existing orders already had hard deletion blocked.
3. **Regression coverage:** Extended `tests/verify.mjs` to check stale catalog removal. Executed its assertion logic with an in-memory Node API shim against the actual GitHub source; 42 checks passed. This is *not* a verified hosted GitHub Actions run.

### Verifications performed
- All inline JavaScript sources in `index.html`, `admin.html`, `orders.html`, `backup.html` compiled.
- PostgreSQL authorized-Admin `BEGIN/ROLLBACK` passed: insert temporary QA product, cost, and gallery metadata; reserve on new pending order; reject duplicate order; reject pending→shipped without confirmation; paid→sold; paid→cancelled returns stock; re-reserve and ship; shipped→cancelled denied; rollback complete.
- PostgreSQL `BEGIN/ROLLBACK` passed: product edit permitted but hard-delete rejected by privilege.
- Public/unauthorized roles cannot see hidden product/photo metadata; Admin can. Supabase performance advisor has **zero findings**.
- End-of-audit DB: 154 products (131 available, 0 reserved, 23 sold); zero inconsistent sold flags, zero QA residue; 0 order/cost/photo records created as test artifacts. 2 internal backup snapshots; daily Cron job active.
- Checked GitHub repository is public with default branch `main`. The available GitHub workflow-run connector filters PR-triggered runs, and returned no relevant run; **GitHub-hosted CI and Pages HTTP availability remain unverified**, although test source executes successfully with an in-memory Node shim.

### Remaining owner/account-only acceptance items
- Sign in with the store's actual Admin account on phone and desktop; verify product add/edit, image upload from a device, reserve/paid/shipped/cancelled workflow, customer-facing stock display, and Messenger opening. These are not independently browser-tested by this audit.
- Enable Supabase Auth leaked-password protection if plan allows. Security Advisor still reports `auth_leaked_password_protection` disabled; current Supabase connector cannot change Auth provider settings.
- Create an **off-Supabase** private backup copy (the Admin `backup.html` exports JSON; internal Cron snapshots are not off-site and JSON excludes physical image bytes). Confirm hosted GitHub Actions/Pages status in the repository UI.

### Links
- https://knbowpani-wq.github.io/clicko-store/
- https://knbowpani-wq.github.io/clicko-store/admin.html
- https://knbowpani-wq.github.io/clicko-store/orders.html
- https://knbowpani-wq.github.io/clicko-store/backup.html

## Homepage approved visual redesign — 2026-11-07

- Applied user's approved blue/white Clicko homepage design to the live GitHub main branch (`index.html`), retaining real HTML buttons and navigation rather than inserting the whole concept screenshot as one non-interactive image.
- Created scalable vector illustrations: `assets/clicko-gear-hero.svg` and `assets/clicko-trade-gpu.svg`. These are website artwork based on the approved direction, not the exact pixels of the generated concept.
- Added responsive header links, gaming gear + PC parts hero heading, product CTA, call CTA, three benefit cards, illustrated buyback and Facebook review card.
- Review link maintained as `https://www.facebook.com/share/p/1Py6autXgD/`; catalog link `#catalog`, buyback `#buyback`, reviews `#reviews`, phone `tel:0959759965`.
- Verified all inline JS compiles, existing GitHub regression suite passed 42 checks in in-memory runner, and new navigational/asset checks passed. Browser pixel-match and GitHub Pages propagation not independently verified.

## Manufacturer illustration program — 2026-11-08

- User authorized use of **manufacturer product images for all SKUs** as illustrations, not as evidence of the condition of used items.
- Live audit: 154 products, 2 products with pre-existing image URLs, 152 with no main image, 0 secondary photos, 0 verified manufacturer images. Existing images are not assumed to be manufacturer-owned nor relabeled.
- Added `manufacturer_image_url`, `manufacturer_source_url`, `manufacturer_image_verified` to `clicko_products`. A verified photo must have an HTTPS image URL and HTTPS source page URL; SQL CHECK enforces both non-null and non-empty, and Admin must explicitly affirm model, color and image usage permission.
- Admin UI now has distinct manufacturer-image fields; image uploads and existing shop photos remain separate and unchanged.
- Customer cards use a manufacturer illustration *only when verified* and when a separate existing shop/gallery image isn't available. Manufacturer images have the visible label `ภาพจากผู้ผลิต · ภาพประกอบ`; product detail warns the image does not show actual used-item condition.
- `backup.html` preserves manufacturer image provenance in restore workflows. Tests expanded to 51 checks in source-level runner; authorized Admin BEGIN/ROLLBACK verified correct SQL constraint behaviour, with zero QA residue.
- Created public `manufacturer-photo-checklist.csv` enumerating 154 catalog SKUs, model names, conditions and current image status.
- **Source acquisition blocker:** Live external manufacturer websites and image/license verification could not be accessed because web browsing was disabled. No URLs or licensed image rights were invented. **0 of the 152 missing product photos have been sourced or populated during this task.** The source-verification queue is ready for a browsing-enabled follow-up.

## Catalog search and filter repair — 2026-11-08

- Fixed UI controls at top of storefront catalog: search, stock/condition/sort dropdowns, category chips.
- Removed stale early event-handler bindings that referenced an older `draw` function. Installed one final event controller after all storefront overlays and render wrappers, so the current UI redraws on search input, select change and category-chip click.
- Search text now resets a previously selected category to `ทั้งหมด`, so changing search terms cannot silently remain constrained to an unrelated category.
- Introduced pure `clickoFilterCatalogItems()` with whitespace-normalized token search, short-model-token word matching, selected category, condition, availability and price sorting. Test phrase `G PRO` now returns relevant G PRO product names instead of broad matches from the word GAMING in categories.
- Added accessible, visible filter feedback and keyboard focus outlines.
- Regression suite extended with direct tests against the existing 154-product embedded catalog and simulated input/change/chip click events: **72 checks passed** using a local in-memory Node API shim. Hosted real-browser clicks are **not** independently verified.
- Only `index.html` and test/report files changed. Supabase products, prices, orders and stock were not modified.
