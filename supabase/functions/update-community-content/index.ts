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
  const title = cleanText(body.title, 80);
  const textBody = cleanBody(body.body, 2000);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (targetType !== "post" && targetType !== "comment") return json({ error: "INVALID_TARGET_TYPE" }, 400);
  if (!targetId) return json({ error: "INVALID_TARGET_ID" }, 400);
  if (targetType === "post" && (!title || title.length < 2)) return json({ error: "INVALID_TITLE" }, 400);
  if (!textBody || textBody.length < 1 || (targetType === "post" && textBody.length < 2)) return json({ error: "INVALID_BODY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const table = targetType === "post" ? "la_community_posts" : "la_community_comments";
  const selectColumns = targetType === "post"
    ? "id,author_user_key,school_id,visibility,deleted_at"
    : "id,post_id,author_user_key,school_id,visibility,deleted_at";

  const existing = await supabase
    .from(table)
    .select(selectColumns)
    .eq("id", targetId)
    .maybeSingle();

  if (existing.error) return json({ error: "TARGET_LOOKUP_FAILED", detail: existing.error.message }, 500);
  if (!existing.data?.id) return json({ error: "TARGET_NOT_FOUND" }, 404);
  if (existing.data.author_user_key !== userKey) return json({ error: "OWNER_REQUIRED" }, 403);
  if (existing.data.deleted_at || existing.data.visibility === "deleted") return json({ error: "TARGET_ALREADY_DELETED" }, 409);

  const now = new Date().toISOString();
  const patch = targetType === "post"
    ? { title, body: textBody, updated_at: now }
    : { body: textBody, updated_at: now };

  const updated = await supabase
    .from(table)
    .update(patch)
    .eq("id", targetId)
    .select(targetType === "post"
      ? "id,school_id,anonymous_name,title,body,comment_count,reaction_count,rank_score,created_at,updated_at"
      : "id,post_id,school_id,anonymous_name,body,reaction_count,created_at,updated_at")
    .single();

  if (updated.error) return json({ error: "TARGET_UPDATE_FAILED", detail: updated.error.message }, 500);

  if (targetType === "post") {
    const feed = await supabase
      .from("la_feed_items")
      .update({ title, summary: textBody.slice(0, 180), updated_at: now })
      .eq("metadata->>post_id", targetId);
    if (feed.error) return json({ error: "FEED_UPDATE_FAILED", detail: feed.error.message }, 500);
  }

  const key = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (key.error) return json({ error: "USER_KEY_LOOKUP_FAILED", detail: key.error.message }, 500);

  const event = await supabase.from("la_activity_events").insert({
    event_type: targetType === "post" ? "community_post_updated" : "community_comment_updated",
    actor_user_id: key.data?.user_id || null,
    actor_user_key: userKey,
    school_id: Number(existing.data.school_id),
    target_type: targetType === "post" ? "community_post" : "community_comment",
    target_id: targetId,
    idempotency_key: `community_${targetType}_updated:${targetId}:${now}`,
    payload: targetType === "post" ? { title } : {},
  });
  if (event.error) return json({ error: "UPDATE_EVENT_INSERT_FAILED", detail: event.error.message }, 500);

  return json({ ok: true, target_type: targetType, content: updated.data });
});
