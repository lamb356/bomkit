# BLOCKED

## RESOLVED

### TASK 11: GitHub push (resolved 2026-04-03)

- `gh` CLI is now installed and authenticated as `lamb356`.
- Remote `origin` is set to `https://github.com/lamb356/bomkit.git`.
- All commits are pushed and in sync with remote.

### TASK 12: KiCad pcbnew integration test (resolved 2026-04-03)

- KiCad was installed on Windows and the integration test was executed with KiCad's embedded Python.
- The true pcbnew path passed successfully against the fixture board.
- Windows KiCad path used:
  - `C:\Users\burba\AppData\Local\Programs\KiCad\9.0\bin\python.exe`
- Verified outputs were written to:
  - `bomkit-fab/tests/fixtures/test_board/generated/manual_kicad/test_board_BOM_JLCPCB.csv`
  - `bomkit-fab/tests/fixtures/test_board/generated/manual_kicad/test_board_CPL_JLCPCB.csv`
- Board adapter compatibility fixes were applied so the plugin now works with real KiCad pcbnew behavior.

### P3 TASK 2: Drizzle push to Neon (resolved 2026-04-04)

- `drizzle.config.ts` now hydrates `.env.local` before Drizzle runs.
- `npx drizzle-kit push --force` succeeded against Neon.
- Billing-related schema fields were also added for Stripe integration:
  - `users.billing_tier`
  - `users.stripe_customer_id`
  - `users.stripe_subscription_id`

## STILL BLOCKED

### P3 TASK 13: Vercel production deploy (blocked 2026-04-04)

- A Windows-native deploy was delegated to Claude Code with:
  - `cd C:\Users\burba\bomkit\bomkit-dashboard && npx vercel --prod --yes`
- Claude Code reported that the Vercel token is invalid or expired.
- `npx vercel whoami` in WSL also showed no usable credentials.

Impact:
- Local tests and production build pass.
- Launch drafts can be prepared.
- Production deployment cannot complete until Vercel is re-authenticated.

### P3 TASK 11: Stripe live completion still partially blocked (blocked 2026-04-04)

- Stripe checkout, portal, and webhook routes are implemented.
- Stripe products/prices were created for Solo and Pro.
- `.env.local` was updated with generated price IDs.
- Remaining missing env for full live billing validation:
  - `STRIPE_WEBHOOK_SECRET`
- Without a real webhook secret and end-to-end webhook delivery, checkout can be created but automatic post-checkout tier sync cannot be fully verified.

### P3 TASK 14: forum/reddit posting credentials still missing (blocked 2026-04-04)

Missing from `~/.hermes/.env`:
- `KICAD_FORUM_API_KEY`
- `KICAD_FORUM_URL`
- `REDDIT_CLIENT_ID`
- `REDDIT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`

Impact:
- Launch drafts were written to `.hermes/launches/bomkit-dashboard/`.
- Actual forum/Reddit posting still cannot be automated from Hermes until those credentials are present.
