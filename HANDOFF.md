# Handoff — Warframe Market Stocks

**Date:** 2026-07-20  
**Branch:** `master` (local git; not necessarily pushed)  
**Status:** Phases 1–3 working locally. Phase 4 (Discord) not started. Deploy/cron not live yet.

---

## What this project is

Personal platinum flip / price-drop monitor:

1. Cron jobs call **Warframe.market API** (not scraping the website)
2. Results land in **Supabase Postgres**
3. **Next.js dashboard** reads the DB only

---

## Done

### Foundation
- Next.js 15 App Router + Tailwind + TypeScript (`src/`)
- Supabase migration: `supabase/migrations/20260720191900_initial_schema.sql`
- Typed clients: `src/lib/supabase/`
- Env template: `.env.example` (real secrets in `.env.local` — **do not commit**)

### WFM client (`src/lib/wfm/`)
- **v2** for items + orders (`data` envelope)
- **v1** for statistics only (`payload` envelope) — still required
- Rate limit ≤ 3 req/s, 429 backoff, 15s timeout, `Platform: pc` + `WFM_USER_AGENT`

### Scan / sync (Bearer `CRON_SECRET`)
| Route | Role |
|-------|------|
| `POST/GET /api/cron/sync-items` | Full catalog → `items` |
| `POST/GET /api/cron/scan` | Batch price scan → snapshots, history, alerts; advances `scan_cursor` |

Scan details:
- Watchlist-first (max 50% of batch) so catalog cursor still advances
- Sequential WFM calls (no parallel fan-out)
- In-process extra batch within ~45s budget (no HTTP self-chain)
- Soft running lock ~15 min
- Defaults: spread ≥ 5p, ROI ≥ 15%, price drop &lt; 85% of 48h median
- Env overrides: `SCAN_BATCH_SIZE`, `MIN_SPREAD`, `MIN_ROI_PCT`, `PRICE_DROP_FACTOR`, `SCAN_STATS_EVERY_BATCH`

### Market helpers (`src/lib/market/`)
Spread/ROI, median48h / price-drop, history prune (7 days)

### Dashboard
| Path | Purpose |
|------|---------|
| `/` | Top flips + recent alerts + scan strip |
| `/alerts` | Alert feed |
| `/watchlist` | Pin/unpin |
| `/items/[urlName]` | Detail + history + alerts |
| `/status` | Cursor / counts |

Data layer: `src/lib/dashboard/` (service-role server reads/actions). No auth UI.

### Schedulers (in repo, inactive until deploy)
- `.github/workflows/scan.yml` — every 4 hours UTC + `workflow_dispatch`
- `vercel.json` — daily `0 6 * * *` backup

### Rules / skills (Cursor)
- Project: `.cursor/rules/project.mdc`
- Personal: `~/.cursor/rules/`, skills `plan-orchestrator`, `git-commit`, etc.

---

## Verified locally (2026-07-20)

- `npm run dev` + dashboard loads with real Supabase
- `sync-items` succeeds after v2 migration
- `scan` succeeds against live WFM + DB

---

## How to run tomorrow

```powershell
cd c:\Users\Petar\OneDrive\Projekti\warframe-market-stocks
npm run dev
```

Smoke cron (secret must match `.env.local` `CRON_SECRET`):

```powershell
$secret = "<your CRON_SECRET from .env.local>"

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/cron/sync-items" `
  -Headers @{ Authorization = "Bearer $secret" }

Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/cron/scan" `
  -Headers @{ Authorization = "Bearer $secret" }
```

Refresh `/`, `/status`, pin on `/watchlist`, re-scan.

---

## Env checklist

Required in `.env.local` / Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (use a strong random value before public deploy)
- `WFM_USER_AGENT` (descriptive, with contact)

Optional: scan threshold envs; `DISCORD_WEBHOOK_URL` (unused until Phase 4)

GitHub Actions secrets (after push + Vercel URL):

- `APP_URL` — e.g. `https://your-app.vercel.app` (no trailing slash)
- `CRON_SECRET` — same as Vercel

---

## Not done / next options

1. **Deploy** — push repo → Vercel → set env → set GH secrets → run Actions once manually  
2. **Phase 4 Discord** — on new `alerts` row, POST webhook; set `notified_discord_at`  
3. **Hardening** — simple password / middleware if URL is public (currently open dashboard + service-role on server)  
4. **Ops** — occasional `sync-items` on a slower schedule (catalog changes); scan every 4h is the main loop  

---

## Important caveats

- **Do not scrape** warframe.market HTML; API only; respect 3 req/s  
- v1 items/orders are **dead** (404/403); code already on v2 for those  
- Dashboard uses **service role on the server** — fine for personal local/Vercel; not multi-tenant secure  
- RLS enabled in SQL with **no anon policies** — browser anon client won’t read data; pages use server queries  
- Soft scan lock is not a distributed lock; fine at personal scale  
- OneDrive + `.next` sometimes causes weird Windows build `readlink` errors — delete `.next` and rebuild if needed  

---

## Suggested first prompt tomorrow

> Continue from HANDOFF.md: deploy to Vercel and wire GitHub Actions cron, **or** implement Phase 4 Discord alerts. Prefer [deploy | Discord].

Use `plan-orchestrator` for multi-step work; keep git commits without AI co-author trailers.
