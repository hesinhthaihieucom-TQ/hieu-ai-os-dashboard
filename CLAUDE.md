# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two unrelated projects live in this one repo:

1. **`nhan-hieu/`** — "Xây Nhân Hiệu", a Vietnamese personal-branding SaaS (part of the "HIỂU"/"HIỂU KÊNH" ecosystem). This is the active product — nearly all work happens here. Live at `hesinhthaihieu.com/webxaynhanhieu/` (via a Cloudflare Worker reverse-proxy) and `hieu-ai-os-dashboard.vercel.app/nhan-hieu/` (the underlying Vercel deployment).
2. **Root `index.html` + `data.json`** — an older, much simpler static "dashboard" (pricing/offer snapshot page). `index.html` fetches `data.json` at load and renders it; editing `data.json` is the only normal maintenance here. Unrelated to `nhan-hieu/`, no shared code.

No `package.json`, no build step, no bundler, no test suite, no linter. Everything is hand-written vanilla HTML/CSS/JS served as static files, plus Vercel serverless functions in `api/`. There is nothing to "build" — edit a file, `node --check path/to/file.js` to catch syntax errors, commit, push; Vercel deploys `main` automatically. The Cloudflare Worker proxy in front of `hesinhthaihieu.com` is not part of this repo.

## Commands

- **Syntax-check a JS file before committing** (the only "build" step that exists): `node --check nhan-hieu/js/<file>.js` or `node --check api/<file>.js`
- **Preview locally**: `cd nhan-hieu && python3 -m http.server 8791`, then open `http://localhost:8791`. Real auth needs a live Supabase session; to preview UI without logging in, inject a fake `window.supabaseClient` (chainable stub implementing `.from().select().eq().maybeSingle()` etc.) in a scratch HTML file *before* `js/app-shell.js` loads, or write a tiny harness that loads `util.js` + one module file directly and calls `window.Modules['<key>'].render(container, ctx)` with a hand-built `ctx`.
- **No lint/test commands exist.** Don't invent `npm test`/`npm run lint` — there is no `package.json`.

## Architecture — `nhan-hieu/`

**Stack**: static HTML/CSS/vanilla-JS SPA with hash routing, Supabase (Postgres + Auth + RLS), Vercel serverless functions calling the Anthropic Messages API (model `claude-sonnet-5`, forced `tool_choice` for structured JSON output).

**Module system**: every screen is one file in `nhan-hieu/js/<name>.js`, wrapped in an IIFE, registering itself as `window.Modules['<route-key>'] = { title, render(container, ctx) }`. `ctx` is `{ supabase, user, profile }`. Routing is a flat hash-to-module lookup (`NAV` array + `currentRouteFromHash()` in `app-shell.js`); there's no nested routing or history stack. All module scripts are loaded via plain `<script>` tags in `nhan-hieu/index.html`, in dependency order (`util.js` and `supabase-client.js` first).

**`app-shell.js` is NOT wrapped in an IIFE** — its top-level `const`/`function` declarations live in the shared global scope of the page (classic scripts, not ES modules), so sibling module files can reference `app-shell.js` globals directly (e.g. `AppState`, `PAYMENT_BANK`). This is deliberate, not an oversight — don't "fix" it by wrapping it.

**Shared helpers** (`nhan-hieu/js/util.js`, also not module-scoped): `esc()`, `callApi()`, `breakSentences()`, `excerpt()`, `confirmModal()`, `animateProgressButton()`/`animateProgressBar()`/`startWaitReassurance()`, and the draft-persistence trio below.

**Per-module draft persistence** (`module_drafts` table: `user_id, module_key, data jsonb`): `loadModuleDraft(ctx, key)` / `saveModuleDraft(ctx, key, data)` / `clearModuleDraft(ctx, key)` in `util.js`. Every module whose UI holds meaningful in-progress work (typed text, uploaded images, AI results not yet saved elsewhere) should persist a draft after each meaningful state change and restore it in `boot()` — but only when there's no explicit incoming `window.Pending*` signal (a deliberate new navigation always wins over a stale draft). Modules that already write every result to their own history table (e.g. `content_scores`, `hook_scores`) don't need a separate draft — just restore from `state.history[0]` in `boot()`. `Lịch Đăng Bài` predates this pattern and uses its own dedicated table (`weekly_ai_drafts`) instead — don't migrate it, it works differently by design (keyed by week, not by module).

**AI cost / quota system**: `api/_lib/trial-quota.js` defines `AI_WEIGHTS` (per-endpoint lượt cost, 1–6, reflecting real Anthropic API cost — expensive multi-step actions like Định Vị or Sửa Kênh cost more lượt than a single cheap hook rewrite), `TRIAL_AI_LIMIT` (lifetime cap for never-paid users), `PAID_MONTHLY_AI_LIMIT` (monthly cap for paid users, resets by `paid_ai_month`). `checkAndConsumeTrialQuota(userId, actionKey)` / `refundTrialQuota(userId, actionKey)` wrap a single atomic Postgres RPC (`consume_ai_quota`/`refund_ai_quota` in `supabase/schema_full.sql`, `select ... for update` row lock — prevents a race where parallel requests from the same user both read the old count before either writes back). These RPC functions are granted to `service_role` only, never `authenticated`/`anon` (they take a raw `p_user_id`, so exposing them client-side would let a user edit another user's quota). **`nhan-hieu/js/app-shell.js` keeps a second, client-side copy of the same weights** (`GATED_API_WEIGHTS`) purely to optimistically bump the sidebar's live lượt counter without waiting for a page reload — it must be kept in sync by hand with `AI_WEIGHTS` whenever a weight or an endpoint's gating status changes. The real enforcement is always server-side; the client copy is cosmetic only.

**Payments**: `PAYMENT_BANK` (VietinBank account) is hardcoded in `app-shell.js`. Each user gets a unique `ref_code` (set at signup) embedded in the VietQR `addInfo` param and shown as the transfer content. **VietinBank-specific gotcha**: SePay only reports a VietinBank balance change if the transfer content starts with the literal keyword `SEVQR` — the transfer content is built as `` `SEVQR ${refCode}` ``, not just the bare ref code. `api/sepay-webhook.js` extracts the ref code with a regex that matches anywhere in the string, so the `SEVQR` prefix doesn't need special handling there. Every webhook call (matched or not) is logged to `sepay_transactions` with a `status` (`matched` / `unmatched_code` / `unmatched_amount`) — that table is the first place to look when a payment doesn't auto-activate. `AMOUNT_TO_DAYS` in the webhook maps exact transfer amounts to package durations; **every package's price must be numerically unique across all pricing tables** (regular/student/flash-sale) or the webhook can't tell which package was paid for.

**Admin** (`nhan-hieu/js/quan-tri*.js`, admin-only route): manual override buttons for when the automatic SePay flow fails — "Gia hạn" (+30/180/365 days, only touches `access_until`) and "💰 Đánh dấu đã trả phí" (only toggles `has_paid`) are independent and both usually need to be clicked together when activating a customer by hand, since `has_paid` gates which lượt cap (`TRIAL_AI_LIMIT` vs `PAID_MONTHLY_AI_LIMIT`) applies.

**Schema migrations**: `supabase/schema_full.sql` is the single file to run in the Supabase SQL editor — it's additive/idempotent (`if not exists`, `or replace`), safe to re-run anytime, and is the *only* way schema changes take effect (nothing runs it automatically). After any change to this file, remind whoever owns the Supabase project to re-run it — until they do, new tables/columns/functions don't exist in production even though the app code already expects them (RPC calls fail closed/harmlessly in that case, they don't crash the app, but the feature silently has no effect).

## Conventions specific to this codebase

- Comments explain *why*, in Vietnamese, matching the existing style — a hidden constraint, a past incident, a non-obvious tradeoff. Not what the code does.
- Fixes are scoped tightly to what was asked; no drive-by refactors of unrelated code in the same file.
- `git commit` + `git push` directly to `main` after `node --check` passes — this project has no CI/PR gate, that's the deploy mechanism.
- The end user (Quỳnh, project owner) is non-technical and writes in fast, short Vietnamese messages, often with screenshots. Business/pricing/quota decisions (lượt weights, package prices, trial limits) are hers to make — present a recommendation with the reasoning and a concrete number, don't silently pick one. Schema-affecting or destructive changes should be confirmed before running.
