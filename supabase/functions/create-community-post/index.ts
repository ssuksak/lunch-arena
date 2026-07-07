import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

type Body = {
  user_key?: string;
  source?: string;
  title?: string;
  body?: string;
  anonymous_name?: string;
  idempotency_key?: string;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.slice(0, maxLength);
}

function cleanBody(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
}

function normalizeSource(value: unknown, userKey: string) {
  const source = String(value || "").trim();
  if (source === "toss" || source === "fp") return source;
  if (userKey.startsWith("toss_")) return "toss";
  if (userKey.startsWith("fp_")) return "fp";
  return "";
}

function score(reactions = 0, comments = 0, createdAt = new Date().toISOString()) {
  const ageHours = Math.max(0, (Date.now() - Date.parse(createdAt)) / 36e5);
  return reactions * 2 + comments + Math.max(0, 48 - ageHours) / 48;
}

async function resolveUser(supabase: ReturnType<typeof createClient>, userKey: string, source: string) {
  const existingKey = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (existingKey.data?.user_id) return existingKey.data.user_id as string;

  const insertedUser = await supabase
    .from("la_users")
    .insert({ primary_user_key: userKey, metadata: { created_by: "create-community-post" } })
    .select("id")
    .single();

  let userId = insertedUser.data?.id as string | undefined;
  if (insertedUser.error) {
    const fallback = await supabase.from("la_users").select("id").eq("primary_user_key", userKey).maybeSingle();
    if (fallback.error || !fallback.data?.id) throw new Error(`USER_CREATE_FAILED:${insertedUser.error.message}`);
    userId = fallback.data.id as string;
  }

  const insertedKey = await supabase.from("la_user_keys").insert({
    user_key: userKey,
    user_id: userId,
    source,
    is_primary: true,
    verified_at: new Date().toISOString(),
    metadata: { created_by: "create-community-post" },
  });
  if (insertedKey.error && insertedKey.error.code !== "23505") {
    throw new Error(`USER_KEY_CREATE_FAILED:${insertedKey.error.message}`);
  }
  return userId!;
}

async function syncCurrentSchoolMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userKey: string,
  schoolId: number,
) {
  const now = new Date().toISOString();
  const current = await supabase
    .from("la_user_school_memberships")
    .select("id,school_id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (current.error) throw new Error(`MEMBERSHIP_LOOKUP_FAILED:${current.error.message}`);
  if (current.data?.school_id && Number(current.data.school_id) === schoolId) return;

  if (current.data?.id) {
    const closed = await supabase
      .from("la_user_school_memberships")
      .update({ is_current: false, ended_at: now, updated_at: now })
      .eq("id", current.data.id);
    if (closed.error) throw new Error(`MEMBERSHIP_CLOSE_FAILED:${closed.error.message}`);
  }

  const inserted = await supabase.from("la_user_school_memberships").insert({
    user_id: userId,
    user_key: userKey,
    school_id: schoolId,
    role: "student",
    is_current: true,
    source: "membership",
    metadata: { created_by: "create-community-post" },
  });
  if (inserted.error) throw new Error(`MEMBERSHIP_CREATE_FAILED:${inserted.error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: "SERVER_NOT_CONFIGURED" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const userKey = String(body.user_key || "").trim();
  const source = normalizeSource(body.source, userKey);
  const title = cleanText(body.title, 80);
  const textBody = cleanBody(body.body, 2000);
  const anonymousName = cleanText(body.anonymous_name, 16) || "?�명";
  const idempotencyKey = cleanText(body.idempotency_key, 180);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!source) return json({ error: "INVALID_SOURCE" }, 400);
  if (!title || title.length < 2) return json({ error: "INVALID_TITLE" }, 400);
  if (!textBody || textBody.length < 2) return json({ error: "INVALID_BODY" }, 400);
  if (!idempotencyKey) return json({ error: "INVALID_IDEMPOTENCY_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const userId = await resolveUser(supabase, userKey, source);
    const membership = await supabase
      .from("la_user_school_memberships")
      .select("school_id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .maybeSingle();
    if (membership.error) return json({ error: "MEMBERSHIP_LOOKUP_FAILED", detail: membership.error.message }, 500);
    if (!membership.data?.school_id) return json({ error: "SCHOOL_OWNERSHIP_REQUIRED" }, 403);
    const schoolId = Number(membership.data.school_id);

    const activeFlag = await supabase
      .from("la_user_safety_flags")
      .select("id,flag_type,expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("flag_type", ["spam", "community_limited"])
      .limit(1);
    if (activeFlag.error) return json({ error: "SAFETY_FLAG_LOOKUP_FAILED", detail: activeFlag.error.message }, 500);
    if ((activeFlag.data || []).length) return json({ error: "USER_COMMUNITY_LIMITED" }, 403);

    const now = new Date().toISOString();
    const profile = await supabase.from("la_user_profiles").upsert({
      user_id: userId,
      display_name: anonymousName,
      selected_school_id: schoolId,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: "user_id" });
    if (profile.error) return json({ error: "PROFILE_UPSERT_FAILED", detail: profile.error.message }, 500);
    await syncCurrentSchoolMembership(supabase, userId, userKey, schoolId);

    const postInsert = await supabase
      .from("la_community_posts")
      .insert({
        author_user_id: userId,
        author_user_key: userKey,
        school_id: schoolId,
        anonymous_name: anonymousName,
        title,
        body: textBody,
        rank_score: score(0, 0, now),
        idempotency_key: idempotencyKey,
        metadata: { created_by: "create-community-post" },
        created_at: now,
        updated_at: now,
      })
      .select("id,school_id,anonymous_name,title,body,comment_count,reaction_count,rank_score,created_at")
      .single();

    if (postInsert.error?.code === "23505") return json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, 409);
    if (postInsert.error) return json({ error: "POST_INSERT_FAILED", detail: postInsert.error.message }, 500);

    const post = postInsert.data;
    const event = await supabase.from("la_activity_events").insert({
      event_type: "community_post_created",
      actor_user_id: userId,
      actor_user_key: userKey,
      school_id: schoolId,
      target_type: "community_post",
      target_id: post.id,
      idempotency_key: `community_post_created:${post.id}`,
      payload: { title },
    }).select("id").single();
    if (event.error) return json({ error: "EVENT_INSERT_FAILED", detail: event.error.message }, 500);

    const feed = await supabase.from("la_feed_items").insert({
      source_event_id: event.data.id,
      school_id: schoolId,
      feed_scope: "global",
      title,
      summary: textBody.slice(0, 180),
      rank_score: post.rank_score,
      visibility: "public",
      published_at: now,
      metadata: { source: "community_post", post_id: post.id },
    });
    if (feed.error) return json({ error: "FEED_INSERT_FAILED", detail: feed.error.message }, 500);

    return json({ ok: true, post });
  } catch (error) {
    return json({ error: "CREATE_COMMUNITY_POST_FAILED", detail: String(error instanceof Error ? error.message : error) }, 500);
  }
});
