import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SUPABASE_URL = "https://puwthqzbounohrdmacgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0";
const ORIGIN = "http://localhost:5173";
const SCHOOL_ID = 1863;

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

const RUN_ID = stamp();
const userKey = `fp_laonly_${RUN_ID}`;
const reporterKey = `fp_laonly_reporter_${RUN_ID}`;

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail ? `\n${JSON.stringify(detail, null, 2)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

function sqlQuery(sql) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const dir = mkdtempSync(join(tmpdir(), "la-live-sql-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, sql, "utf8");
  let output = "";
  try {
    output = execFileSync(
      npx,
      ["--yes", "supabase", "db", "query", "--linked", "--file", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
  } catch (error) {
    const stdout = String(error?.stdout || "");
    const stderr = String(error?.stderr || "");
    throw new Error(`Supabase SQL failed\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  assert(start >= 0 && end > start, "Could not parse supabase db query output", { output });
  return JSON.parse(output.slice(start, end + 1));
}

async function edge(name, body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  json._status = response.status;
  return json;
}

async function preflight(name) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "apikey,authorization,content-type",
    },
  });
  const allowHeaders = response.headers.get("access-control-allow-headers") || "";
  assert(response.ok, `${name} CORS preflight failed`, { status: response.status, allowHeaders });
  assert(/apikey/i.test(allowHeaders), `${name} CORS missing apikey`, { allowHeaders });
}

function seedLaUsers() {
  sqlQuery(`
    with input(user_key, display_name) as (
      values
        ('${userKey}', 'LA only tester'),
        ('${reporterKey}', 'LA only reporter')
    ),
    inserted_users as (
      insert into public.la_users (primary_user_key, metadata)
      select user_key, jsonb_build_object('created_by', 'verify-la-live')
      from input
      where not exists (
        select 1
        from public.la_users u
        where u.primary_user_key = input.user_key
      )
      returning id, primary_user_key
    ),
    all_users as (
      select id, primary_user_key from inserted_users
      union
      select u.id, u.primary_user_key
      from public.la_users u
      join input i on i.user_key = u.primary_user_key
    ),
    upsert_keys as (
      insert into public.la_user_keys (user_key, user_id, source, is_primary, verified_at, metadata)
      select primary_user_key, id, 'fp', true, now(), jsonb_build_object('created_by', 'verify-la-live')
      from all_users
      on conflict (user_key) do update
        set user_id = excluded.user_id,
            source = excluded.source,
            is_primary = excluded.is_primary,
            verified_at = excluded.verified_at,
            updated_at = now()
      returning user_id
    ),
    upsert_profiles as (
      insert into public.la_user_profiles (user_id, display_name, selected_school_id, last_seen_at, updated_at)
      select u.id, i.display_name, ${SCHOOL_ID}, now(), now()
      from all_users u
      join input i on i.user_key = u.primary_user_key
      on conflict (user_id) do update
        set display_name = excluded.display_name,
            selected_school_id = excluded.selected_school_id,
            last_seen_at = excluded.last_seen_at,
            updated_at = now()
      returning user_id
    )
    insert into public.la_user_school_memberships
      (user_id, user_key, school_id, role, is_current, source, metadata)
    select u.id, u.primary_user_key, ${SCHOOL_ID}, 'student', true, 'profile',
           jsonb_build_object('created_by', 'verify-la-live')
    from all_users u
    where not exists (
      select 1
      from public.la_user_school_memberships m
      where m.user_id = u.id
        and m.school_id = ${SCHOOL_ID}
        and m.is_current = true
    );
  `);
}

async function main() {
  const functions = [
    "create-community-post",
    "create-community-comment",
    "react-community",
    "report-community-content",
    "delete-community-content",
  ];
  for (const fn of functions) await preflight(fn);

  seedLaUsers();

  const postResult = await edge("create-community-post", {
    user_key: userKey,
    source: "fp",
    title: `LA only verification ${RUN_ID}`,
    body: "LA community post verification.",
    anonymous_name: "LA tester",
    idempotency_key: `laonly:post:${RUN_ID}`,
  });
  assert(postResult.ok && postResult.post?.id, "create-community-post failed", postResult);
  const postId = postResult.post.id;

  const commentResult = await edge("create-community-comment", {
    user_key: userKey,
    source: "fp",
    post_id: postId,
    body: "LA community comment verification.",
    anonymous_name: "LA tester",
    idempotency_key: `laonly:comment:${RUN_ID}`,
  });
  assert(commentResult.ok && commentResult.comment?.id, "create-community-comment failed", commentResult);
  const commentId = commentResult.comment.id;

  const reaction = await edge("react-community", {
    user_key: userKey,
    target_type: "post",
    target_id: postId,
    idempotency_key: `laonly:reaction:${RUN_ID}`,
  });
  assert(reaction.ok && reaction.selected === true, "react-community failed", reaction);

  const report = await edge("report-community-content", {
    user_key: reporterKey,
    target_type: "post",
    target_id: postId,
    reason: "test",
    details: "LA moderation report verification.",
  });
  assert(report.ok && report.report?.id, "report-community-content failed", report);

  const deletedComment = await edge("delete-community-content", {
    user_key: userKey,
    target_type: "comment",
    target_id: commentId,
  });
  assert(deletedComment.ok, "delete-community-content failed", deletedComment);

  const verification = sqlQuery(`
    select
      (select count(*) from public.la_user_keys where user_key in ('${userKey}', '${reporterKey}')) as la_user_keys,
      (select count(*) from public.la_user_profiles p join public.la_user_keys k on k.user_id = p.user_id where k.user_key in ('${userKey}', '${reporterKey}') and p.selected_school_id = ${SCHOOL_ID}) as la_user_profiles,
      (select count(*) from public.la_user_school_memberships where user_key in ('${userKey}', '${reporterKey}') and school_id = ${SCHOOL_ID} and is_current = true) as la_memberships,
      (select count(*) from public.la_community_posts where id = '${postId}' and school_id = ${SCHOOL_ID}) as la_posts,
      (select count(*) from public.la_community_comments where id = '${commentId}' and school_id = ${SCHOOL_ID} and visibility = 'deleted') as la_deleted_comments,
      (select count(*) from public.la_community_reactions where post_id = '${postId}' and user_key = '${userKey}') as la_reactions,
      (select count(*) from public.la_moderation_reports where target_id = '${postId}' and reporter_user_key = '${reporterKey}') as la_reports,
      (select count(*) from public.la_feed_items where metadata->>'post_id' = '${postId}') as la_feed_items,
      (select count(*) from public.la_activity_events where actor_user_key in ('${userKey}', '${reporterKey}')) as la_activity_events;
  `);
  const row = verification.rows?.[0] || {};
  assert(row.la_user_keys === 2, "DB verification failed: la_user_keys", row);
  assert(row.la_user_profiles === 2, "DB verification failed: la_user_profiles", row);
  assert(row.la_memberships === 2, "DB verification failed: la_user_school_memberships", row);
  assert(row.la_posts === 1, "DB verification failed: la_community_posts", row);
  assert(row.la_deleted_comments === 1, "DB verification failed: la_community_comments", row);
  assert(row.la_reactions === 1, "DB verification failed: la_community_reactions", row);
  assert(row.la_reports === 1, "DB verification failed: la_moderation_reports", row);
  assert(row.la_feed_items === 1, "DB verification failed: la_feed_items", row);
  assert(Number(row.la_activity_events || 0) >= 4, "DB verification failed: la_activity_events", row);

  console.log(JSON.stringify({
    ok: true,
    run_id: RUN_ID,
    inspect: {
      user_key: userKey,
      reporter_key: reporterKey,
      school_id: SCHOOL_ID,
      post_id: postId,
      comment_id: commentId,
    },
    db_counts: row,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
