# Master Merge Checklist

Use this before promoting `dk` to `master`.

## 1. Confirm Branch And Clean State

```powershell
git branch --show-current
git status --short
git log --oneline -5
```

Expected:

- Current branch is `dk`.
- Worktree is clean before merge.

## 2. Keep Test Frontend Copy In Sync

```powershell
Get-FileHash -Algorithm SHA256 D:\Data\43_LA\backend\lunch-arena\index.html, D:\Data\43_LA\frontend\index.html
```

Expected:

- Hashes are identical if the user is testing from `D:\Data\43_LA\frontend`.

If not identical:

```powershell
Copy-Item -LiteralPath D:\Data\43_LA\backend\lunch-arena\index.html -Destination D:\Data\43_LA\frontend\index.html -Force
```

## 3. Confirm No Legacy Runtime Writes

Search for browser direct writes to legacy runtime tables:

```powershell
rg -n "rest/v1/(ratings|review_comments|review_reactions|battles|battle_votes|schools|meals)" index.html
```

Expected:

- No legacy table write paths in the cloned test frontend.
- Reads should be `la_*` for the new runtime.

Search for direct browser writes to protected LA runtime tables:

```powershell
rg -n "fetch\(`\$\{SUPABASE_URL\}/rest/v1/la_(reviews|review_comments|review_reactions|battles|battle_votes)|method: 'PATCH'|method: 'DELETE'" index.html
```

Expected:

- No direct `POST/PATCH/DELETE` writes from browser to `la_reviews`, `la_review_comments`, `la_review_reactions`, `la_battles`, or `la_battle_votes`.
- Mutations should call Edge Functions.

## 4. Confirm Supabase Permissions

```powershell
npx supabase db query --linked "select grantee, table_name, privilege_type from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public' and table_name in ('la_reviews','la_review_comments','la_review_reactions','la_battles','la_battle_votes') order by grantee, table_name, privilege_type;"
```

Expected:

- Only `SELECT` for each listed table and role.

Check policies:

```powershell
npx supabase db query --linked "select tablename, policyname, cmd from pg_policies where schemaname='public' and tablename in ('la_reviews','la_review_comments','la_review_reactions','la_battles','la_battle_votes') order by tablename, policyname;"
```

Expected:

- Read policies only for these protected runtime tables.

## 5. Confirm Edge Functions Are Deployed

```powershell
npx supabase functions list --project-ref puwthqzbounohrdmacgo
```

Required review/battle functions:

- `submit-review`
- `update-review`
- `delete-review`
- `create-review-comment`
- `react-review`
- `create-review-photo-upload`
- `review-photo-urls`
- `create-battle`
- `replace-battle-opponent`
- `vote-battle`

Required community functions:

- `create-community-post`
- `create-community-comment`
- `update-community-content`
- `delete-community-content`
- `react-community`
- `report-community-content`

Required school/meal functions:

- `set-user-school`
- `get-user-school`
- `sync-schools`
- `sync-meals`
- `batch-sync-meals`

## 6. Run Verification

```powershell
node scripts\verify-la-runtime-crud.mjs
node scripts\verify-la-live.mjs
npm run build:static
```

Expected:

- Both verification scripts print `"ok": true`.
- Build exits 0.

## 7. Browser Sanity Check

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5173/ -TimeoutSec 5
```

Expected:

- Status `200`.

Optional Playwright check:

```powershell
npm exec -- playwright --version
```

Then run a browser load check if needed.

## 8. Known UI Regression To Retest Manually

The user specifically reported:

- Real-time meal talk comment button did not open.
- Editing a real-time meal talk review did not reflect the changed text.

Manual test:

1. Open `http://localhost:5173/`.
2. Go to `실시간 급식톡`.
3. Click a review's comment button.
4. Confirm the comment input opens under that exact clicked review card.
5. Edit your own review text.
6. Confirm the text changes in Supabase `la_reviews.comment`.
7. Confirm it changes in the visible feed after refresh/reload.

Important implementation detail:

- Do not reintroduce duplicated global element ID lookups for review edit/comment controls.
- Use the clicked `.review-item` scope for all review card actions.

## 9. Master Promotion Notes

Before pushing to `master`, make sure master will receive:

- Edge Function files under `supabase/functions/*`.
- LA runtime migrations under `supabase/migrations/*`.
- Verification scripts under `scripts/*`.
- Frontend fixes in `index.html`.
- This `docs/memory/dk` folder.

Do not merge any change that makes the cloned test frontend write to non-LA runtime tables.

