import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}
function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
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
  const targetId = String(body.target_id || "").trim();
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (targetType !== "post" && targetType !== "comment") return json({ error: "INVALID_TARGET_TYPE" }, 400);
  if (!targetId) return json({ error: "INVALID_TARGET_ID" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const table = targetType === "post" ? "la_community_posts" : "la_community_comments";
  const selectColumns = targetType === "post"
    ? "id,author_user_key,school_id,deleted_at"
    : "id,post_id,author_user_key,school_id,deleted_at";
  const target = await supabase.from(table).select(selectColumns).eq("id", targetId).maybeSingle();
  if (target.error) return json({ error: "TARGET_LOOKUP_FAILED", detail: target.error.message }, 500);
  if (!target.data?.id) return json({ error: "TARGET_NOT_FOUND" }, 404);
  if (target.data.author_user_key !== userKey) return json({ error: "OWNER_REQUIRED" }, 403);
  if (target.data.deleted_at) return json({ error: "TARGET_ALREADY_DELETED" }, 409);

  const now = new Date().toISOString();
  const updated = await supabase.from(table).update({
    visibility: "deleted",
    deleted_at: now,
    updated_at: now,
  }).eq("id", targetId);
  if (updated.error) return json({ error: "DELETE_FAILED", detail: updated.error.message }, 500);

  if (targetType === "post") {
    const feedUpdate = await supabase
      .from("la_feed_items")
      .update({ visibility: "deleted", updated_at: now })
      .eq("metadata->>post_id", targetId);
    if (feedUpdate.error) return json({ error: "FEED_DELETE_FAILED", detail: feedUpdate.error.message }, 500);
  } else if (target.data.post_id) {
    const countUpdate = await supabase.rpc("la_increment_community_comment_count", {
      p_post_id: target.data.post_id,
      p_delta: -1,
    });
    if (countUpdate.error) return json({ error: "COMMENT_COUNT_UPDATE_FAILED", detail: countUpdate.error.message }, 500);
  }

  const key = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (key.error) return json({ error: "USER_KEY_LOOKUP_FAILED", detail: key.error.message }, 500);
  const event = await supabase.from("la_activity_events").insert({
    event_type: targetType === "post" ? "community_post_deleted" : "community_comment_deleted",
    actor_user_id: key.data?.user_id || null,
    actor_user_key: userKey,
    school_id: Number(target.data.school_id),
    target_type: targetType === "post" ? "community_post" : "community_comment",
    target_id: targetId,
    idempotency_key: `community_${targetType}_deleted:${targetId}:${now}`,
    payload: {},
  });
  if (event.error) return json({ error: "DELETE_EVENT_INSERT_FAILED", detail: event.error.message }, 500);

  return json({ ok: true, target_type: targetType, target_id: targetId });
});
