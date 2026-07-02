# MCP Connections

This project is expected to use project-local MCP configuration from `.mcp.json`.
The file intentionally contains only OAuth-based remote MCP URLs and no tokens.

## Supabase

- MCP server: `https://mcp.supabase.com/mcp`
- Expected project ref: `puwthqzbounohrdmacgo`
- Runtime API URL used by the app: `https://puwthqzbounohrdmacgo.supabase.co`

After opening this repo in an MCP-capable client, authenticate the Supabase MCP
server with an account or organization membership that can access
`puwthqzbounohrdmacgo`.

Current app behavior uses public REST and Edge Functions directly from
`index.html`, so runtime access can work even when MCP management access is not
available. Before DB changes, confirm that the expected project appears in the
MCP project list.

## Cloudflare

- MCP server: `https://mcp.cloudflare.com/mcp`
- Required target: the Cloudflare account invited to manage this app
- Expected account ID from dashboard URL:
  `9fbd18dbefe5c39717909da09b9165cf`
- Project-local MCP entries:
  - `cloudflare-api`: OAuth login for general Cloudflare API access.
  - `cloudflare-r2-projecth`: target R2-only connection. Prefer setting
    `CLOUDFLARE_R2_PROJECTH_MCP_TOKEN` to a Cloudflare API token scoped only to
    account `9fbd18dbefe5c39717909da09b9165cf` and the required R2 permissions.

When authorizing Cloudflare MCP, choose the invited account that should own the
`lunch-arena` Pages or Workers resources. Do not create resources under a
personal/default account unless that is the intended owner.

Cloudflare's official MCP docs allow the same MCP URL to be configured multiple
times under different `mcpServers` names. For automation or account-specific
access, pass an API token as a bearer token in the `Authorization` header. This
is why `.mcp.json` separates the generic Cloudflare entry from the target
R2-only entry.

Known state from the current session:

- Visible account: `Clickaround8@gmail.com's Account`
- Visible account ID: `2c1b8299e2d8cec3f82a016fa88368aa`
- Expected account access check:
  `GET /accounts/9fbd18dbefe5c39717909da09b9165cf` returned Cloudflare error
  `9109 Unauthorized to access requested resource`.
- Visible Pages projects: `arr-frontend`, `ag-frontend`
- Visible Workers: `law-light-api`, `s3-workers`
- Visible R2 buckets on the wrong/default account: `s3-images`
- Visible zones: none
- No `lunch-arena` Cloudflare resource was visible yet.

Verified state after reconnect on 2026-06-29:

- Supabase MCP OAuth login succeeded.
- Target Supabase project is accessible:
  `lunch-arena` / `puwthqzbounohrdmacgo`.
- Cloudflare OAuth login succeeded in a fresh Codex MCP process.
- Target Cloudflare account R2 check succeeded:
  `GET /accounts/9fbd18dbefe5c39717909da09b9165cf/r2/buckets`.
- R2 buckets result on the target account: `lunch-arena`.
- Important: existing long-running MCP tool handles may still show stale
  authentication. If results conflict, start a fresh Codex session/process and
  verify against the explicit target IDs above.

Supabase table/query verification after reconnect on 2026-06-29:

- MCP SQL access to project `puwthqzbounohrdmacgo` succeeded.
- Verified `select count(*)` access:
  - `schools`: 12594
  - `meals`: 620479
  - `ratings`: 151
  - `review_comments`: 0
  - `user_schools`: 755
  - `battles`: 115
  - `battle_votes`: 65
  - `school_engagement_monthly`: 104
  - `school_menu_stats_monthly`: 16
  - `review_reactions`: 22

Connection test on 2026-06-30 in the current session:

- Supabase MCP tools are visible, but management/API actions returned
  `MCP error -32600: You do not have permission to perform this action`.
- Supabase MCP SQL execution also returned the same permission error for
  project `puwthqzbounohrdmacgo`.
- Runtime REST with the anon key embedded in `index.html` is still reachable:
  - `schools`: 206, `0-0/12594`
  - `meals`: 206, `0-0/620806`
  - `ratings`: 206, `0-0/153`
  - `review_comments`: 200, `*/0`
  - `user_schools`: 206, `0-0/888`
  - `battles`: 206, `0-0/115`
  - `battle_votes`: 206, `0-0/65`
  - `school_engagement_monthly`: 206, `0-0/106`
  - `school_menu_stats_monthly`: 206, `0-0/18`
  - `review_reactions`: 401 with anon direct select.
- Cloudflare `cloudflare-api` MCP tool is visible but returned OAuth
  authorization required.
- `CLOUDFLARE_R2_PROJECTH_MCP_TOKEN` is not present in this session, so R2
  mock object put/get/delete could not be performed.
- Direct unauthenticated check of
  `GET /accounts/9fbd18dbefe5c39717909da09b9165cf/r2/buckets` reached
  Cloudflare but failed without credentials.
- Local mock graph validation passed for:
  `la_users -> la_user_keys -> la_activity_events -> la_review_photos(R2) ->
  la_feed_items/la_user_point_ledger/la_missions/la_moderation_reports`.
- After running `codex mcp login cloudflare-api`, browser authentication
  completed successfully, but the active MCP tool handle still returned OAuth
  required. A fresh `codex exec` process also reported the Cloudflare MCP call
  as cancelled before response. Reload/reconnect the MCP session before treating
  Cloudflare as verified.

## Verification Checklist

1. Run the MCP client's connection check for both `supabase` and
   `cloudflare-api`.
2. Supabase should list project `puwthqzbounohrdmacgo`.
3. Cloudflare should list the invited account intended for this app.
4. Only after both checks pass, create or link Cloudflare Pages/Workers for
   `lunch-arena`.
5. For R2-only work, use `cloudflare-r2-projecth` and verify:
   `GET /accounts/9fbd18dbefe5c39717909da09b9165cf/r2/buckets`.
