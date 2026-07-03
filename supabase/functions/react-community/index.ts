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
function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
}
function clean(value: unknown, max = 180) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}
function sourceFor(userKey: string) {
  return userKey.startsWith("toss_") ? "toss" : "fp";
}
async function resolveUser(supabase: ReturnType<typeof createClient>, userKey: string) {
  const existingKey = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (existingKey.data?.user_id) return existingKey.data.user_id as string;
  const user = await supabase.from("la_users").insert({
    primary_user_key: userKey,
    metadata: { created_by: "react-community" },
  }).select("id").single();
  if (user.error) throw new Error(`USER_CREATE_FAILED:${user.error.message}`);
  const key = await supabase.from("la_user_keys").insert({
    user_key: userKey,
    user_id: user.data.id,
    source: sourceFor(userKey),
    is_primary: true,
    verified_at: new Date().toISOString(),
    metadata: { created_by: "react-community" },
  });
  if (key.error && key.error.code !== "23505") throw new Error(`USER_KEY_CREATE_FAILED:${key.error.message}`);
  return user.data.id as string;
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
  const targetType = String(body.target_type || "").trim();
  const targetId = clean(body.target_id, 80);
  const idempotencyKey = clean(body.idempotency_key, 180);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (targetType !== "post" && targetType !== "comment") return json({ error: "INVALID_TARGET_TYPE" }, 400);
  if (!targetId) return json({ error: "INVALID_TARGET_ID" }, 400);
  if (!idempotencyKey) return json({ error: "INVALID_IDEMPOTENCY_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const userSchool = await supabase.from("user_schools").select("school_id").eq("user_key", userKey).maybeSingle();
  if (userSchool.error) return json({ error: "USER_SCHOOL_LOOKUP_FAILED", detail: userSchool.error.message }, 500);
  if (!userSchool.data?.school_id) return json({ error: "SCHOOL_OWNERSHIP_REQUIRED" }, 403);
  const userId = await resolveUser(supabase, userKey);

  const table = targetType === "post" ? "la_community_posts" : "la_community_comments";
  const targetColumns = targetType === "post"
    ? "id,school_id,reaction_count,comment_count,created_at,visibility,moderation_status,deleted_at"
    : "id,school_id,reaction_count,visibility,moderation_status,deleted_at";
  const target = await supabase
    .from(table)
    .select(targetColumns)
    .eq("id", targetId)
    .maybeSingle();
  if (target.error) return json({ error: "TARGET_LOOKUP_FAILED", detail: target.error.message }, 500);
  if (
    !target.data?.id ||
    target.data.deleted_at ||
    target.data.visibility !== "public" ||
    !["unreviewed", "approved"].includes(String(target.data.moderation_status))
  ) {
    return json({ error: "TARGET_NOT_FOUND" }, 404);
  }

  const match = targetType === "post" ? { post_id: targetId } : { comment_id: targetId };
  const existing = await supabase
    .from("la_community_reactions")
    .select("id")
    .match(match)
    .eq("user_key", userKey)
    .eq("reaction", "like")
    .maybeSingle();
  if (existing.error) return json({ error: "REACTION_LOOKUP_FAILED", detail: existing.error.message }, 500);

  const delta = existing.data?.id ? -1 : 1;
  if (existing.data?.id) {
    const deleted = await supabase.from("la_community_reactions").delete().eq("id", existing.data.id);
    if (deleted.error) return json({ error: "REACTION_DELETE_FAILED", detail: deleted.error.message }, 500);
  } else {
    const inserted = await supabase.from("la_community_reactions").insert({
      ...match,
      user_id: userId,
      user_key: userKey,
      school_id: Number(target.data.school_id || userSchool.data.school_id),
      reaction: "like",
      idempotency_key: idempotencyKey,
    });
    if (inserted.error?.code === "23505") return json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, 409);
    if (inserted.error) return json({ error: "REACTION_INSERT_FAILED", detail: inserted.error.message }, 500);
  }

  const countUpdate = await supabase.rpc("la_increment_community_reaction_count", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_delta: delta,
  });
  if (countUpdate.error) return json({ error: "REACTION_COUNT_UPDATE_FAILED", detail: countUpdate.error.message }, 500);
  const updatedCount = Array.isArray(countUpdate.data) ? countUpdate.data[0] : null;
  const nextReactionCount = Number(updatedCount?.reaction_count ?? Math.max(0, Number(target.data.reaction_count || 0) + delta));

  const event = await supabase.from("la_activity_events").insert({
    event_type: delta > 0 ? "community_reaction_created" : "community_reaction_deleted",
    actor_user_id: userId,
    actor_user_key: userKey,
    school_id: Number(target.data.school_id || userSchool.data.school_id),
    target_type: targetType === "post" ? "community_post" : "community_comment",
    target_id: targetId,
    idempotency_key: `${delta > 0 ? "community_reaction_created" : "community_reaction_deleted"}:${targetType}:${targetId}:${userKey}:${Date.now()}`,
    payload: { reaction: "like" },
  });
  if (event.error) return json({ error: "REACTION_EVENT_INSERT_FAILED", detail: event.error.message }, 500);

  return json({ ok: true, selected: delta > 0, reaction_count: nextReactionCount });
});
