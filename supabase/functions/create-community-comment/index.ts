import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}
function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
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
async function resolveUser(supabase: ReturnType<typeof createClient>, userKey: string, source: string) {
  const existingKey = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (existingKey.data?.user_id) return existingKey.data.user_id as string;
  const insertedUser = await supabase.from("la_users").insert({
    primary_user_key: userKey,
    metadata: { created_by: "create-community-comment" },
  }).select("id").single();
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
    metadata: { created_by: "create-community-comment" },
  });
  if (insertedKey.error && insertedKey.error.code !== "23505") throw new Error(`USER_KEY_CREATE_FAILED:${insertedKey.error.message}`);
  return userId!;
}
async function syncProfileAndMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userKey: string,
  schoolId: number,
  displayName: string,
) {
  const now = new Date().toISOString();
  const profile = await supabase.from("la_user_profiles").upsert({
    user_id: userId,
    display_name: displayName,
    selected_school_id: schoolId,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (profile.error) throw new Error(`PROFILE_UPSERT_FAILED:${profile.error.message}`);

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
    metadata: { created_by: "create-community-comment" },
  });
  if (inserted.error) throw new Error(`MEMBERSHIP_CREATE_FAILED:${inserted.error.message}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: "SERVER_NOT_CONFIGURED" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  const userKey = String(body.user_key || "").trim();
  const source = normalizeSource(body.source, userKey);
  const postId = cleanText(body.post_id, 80);
  const anonymousName = cleanText(body.anonymous_name, 16) || "?�명";
  const commentBody = cleanText(body.body, 1000);
  const idempotencyKey = cleanText(body.idempotency_key, 180);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!source) return json({ error: "INVALID_SOURCE" }, 400);
  if (!postId) return json({ error: "INVALID_POST_ID" }, 400);
  if (!commentBody || commentBody.length < 1) return json({ error: "INVALID_BODY" }, 400);
  if (!idempotencyKey) return json({ error: "INVALID_IDEMPOTENCY_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const post = await supabase
    .from("la_community_posts")
    .select("id,school_id,visibility,moderation_status,deleted_at,comment_count,reaction_count,created_at")
    .eq("id", postId)
    .maybeSingle();
  if (post.error) return json({ error: "POST_LOOKUP_FAILED", detail: post.error.message }, 500);
  if (
    !post.data?.id ||
    post.data.deleted_at ||
    post.data.visibility !== "public" ||
    !["unreviewed", "approved"].includes(String(post.data.moderation_status))
  ) {
    return json({ error: "POST_NOT_FOUND" }, 404);
  }

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
    if (schoolId !== Number(post.data.school_id)) return json({ error: "SCHOOL_OWNERSHIP_REQUIRED" }, 403);

    await syncProfileAndMembership(
      supabase,
      userId,
      userKey,
      schoolId,
      anonymousName,
    );
    const comment = await supabase.from("la_community_comments").insert({
      post_id: post.data.id,
      author_user_id: userId,
      author_user_key: userKey,
      school_id: schoolId,
      anonymous_name: anonymousName,
      body: commentBody,
      idempotency_key: idempotencyKey,
      metadata: { created_by: "create-community-comment" },
    }).select("id,post_id,school_id,anonymous_name,body,reaction_count,created_at").single();
    if (comment.error?.code === "23505") return json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, 409);
    if (comment.error) return json({ error: "COMMENT_INSERT_FAILED", detail: comment.error.message }, 500);

    const countUpdate = await supabase.rpc("la_increment_community_comment_count", {
      p_post_id: post.data.id,
      p_delta: 1,
    });
    if (countUpdate.error) return json({ error: "COMMENT_COUNT_UPDATE_FAILED", detail: countUpdate.error.message }, 500);

    const event = await supabase.from("la_activity_events").insert({
      event_type: "community_comment_created",
      actor_user_id: userId,
      actor_user_key: userKey,
      school_id: schoolId,
      target_type: "community_comment",
      target_id: comment.data.id,
      idempotency_key: `community_comment_created:${comment.data.id}`,
      payload: { post_id: post.data.id },
    });
    if (event.error) return json({ error: "EVENT_INSERT_FAILED", detail: event.error.message }, 500);
    return json({ ok: true, comment: comment.data });
  } catch (error) {
    return json({ error: "CREATE_COMMUNITY_COMMENT_FAILED", detail: String(error instanceof Error ? error.message : error) }, 500);
  }
});
