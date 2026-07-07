# Current State

Branch:

- Working branch: `dk`
- Latest implementation commits to preserve for master:
  - `dc50694 Fix scoped review edit and comments`
  - `6ab5db3 Route LA runtime writes through edge functions`
  - `b7c8941 Move review edits to LA edge functions`

Frontend copies:

- Main repo file: `index.html`
- Test frontend copy: `D:\Data\43_LA\frontend\index.html`
- These two files were kept identical when this note was written.

Supabase project:

- Project ref: `puwthqzbounohrdmacgo`
- Public URL used by the test frontend: `https://puwthqzbounohrdmacgo.supabase.co`

Important runtime rule:

- The user is testing a new LA-table runtime.
- The test frontend should create/read/update/delete runtime data in `la_*` tables only.
- Legacy non-LA tables remain for old production behavior and historical reference. Do not use them for the cloned test frontend.

Recently fixed issue:

- Real-time meal talk (`실시간 급식톡`) is rendered from `la_reviews`, not the community post tables.
- The same review can appear in several DOM locations at once: home latest feed, full feed, school detail, my activity.
- Older code used duplicated DOM IDs and `getElementById`, so clicking comments or saving edits could target a hidden duplicate card.
- Current code scopes comment and edit operations to the clicked `.review-item`.

Verified behavior:

- Review edit in the full feed updates `la_reviews.comment`.
- Review comment toggle opens the clicked card's comment panel.
- Review/comment/reaction/battle live CRUD verification passes.
- Community live CRUD verification passes.
- Browser direct insert into protected runtime review tables is blocked.
- Cloudflare R2 presigned upload path was verified separately during the session.

Key verification scripts:

```powershell
node scripts\verify-la-runtime-crud.mjs
node scripts\verify-la-live.mjs
npm run build:static
```

Browser sanity check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5173/ -TimeoutSec 5
```

