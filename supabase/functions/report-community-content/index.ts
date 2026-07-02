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
function clean(value: unknown, max = 500) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
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
  const reason = clean(body.reason, 80);
  const details = clean(body.details, 500);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (targetType !== "post" && targetType !== "comment") return json({ error: "INVALID_TARGET_TYPE" }, 400);
  if (!targetId) return json({ error: "INVALID_TARGET_ID" }, 400);
  if (!reason) return json({ error: "INVALID_REASON" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const table = targetType === "post" ? "la_community_posts" : "la_community_comments";
  const target = await supabase
    .from(table)
    .select("id,school_id,visibility,moderation_status,metadata,deleted_at")
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

  const key = await supabase.from("la_user_keys").select("user_id").eq("user_key", userKey).maybeSingle();
  if (key.error) return json({ error: "USER_KEY_LOOKUP_FAILED", detail: key.error.message }, 500);
  const communityTargetType = targetType === "post" ? "community_post" : "community_comment";
  const report = await supabase.from("la_moderation_reports").insert({
    reporter_user_id: key.data?.user_id || null,
    reporter_user_key: userKey,
    school_id: Number(target.data.school_id),
    target_type: communityTargetType,
    target_id: targetId,
    reason,
    details,
    idempotency_key: `community_report:${targetType}:${targetId}:${userKey}:${reason}`,
    metadata: { created_by: "report-community-content" },
  }).select("id,status,created_at").single();
  if (report.error?.code === "23505") return json({ error: "REPORT_ALREADY_EXISTS" }, 409);
  if (report.error) return json({ error: "REPORT_INSERT_FAILED", detail: report.error.message }, 500);

  const reportEvent = await supabase.from("la_activity_events").insert({
    event_type: "moderation_report_created",
    actor_user_id: key.data?.user_id || null,
    actor_user_key: userKey,
    school_id: Number(target.data.school_id),
    target_type: communityTargetType,
    target_id: targetId,
    idempotency_key: `moderation_report_created:${report.data.id}`,
    payload: { reason },
  });
  if (reportEvent.error) return json({ error: "REPORT_EVENT_INSERT_FAILED", detail: reportEvent.error.message }, 500);

  const openReports = await supabase
    .from("la_moderation_reports")
    .select("reporter_user_key")
    .eq("target_type", communityTargetType)
    .eq("target_id", targetId)
    .in("status", ["open", "reviewing"]);
  if (openReports.error) return json({ error: "REPORT_COUNT_LOOKUP_FAILED", detail: openReports.error.message }, 500);

  const uniqueReporters = new Set((openReports.data || []).map((row) => row.reporter_user_key).filter(Boolean));
  let auto_hidden = false;
  if (uniqueReporters.size >= 3) {
    const now = new Date().toISOString();
    const hidden = await supabase.from(table).update({
      visibility: "hidden",
      moderation_status: "flagged",
      updated_at: now,
      metadata: {
        ...(target.data.metadata && typeof target.data.metadata === "object" ? target.data.metadata : {}),
        auto_hidden_by: "report-community-content",
        report_threshold: 3,
        unique_reporters: uniqueReporters.size,
      },
    }).eq("id", targetId).eq("visibility", "public");
    if (hidden.error) return json({ error: "AUTO_HIDE_FAILED", detail: hidden.error.message }, 500);

    if (targetType === "post") {
      const feedUpdate = await supabase
        .from("la_feed_items")
        .update({ visibility: "hidden", updated_at: now })
        .eq("metadata->>post_id", targetId);
      if (feedUpdate.error) return json({ error: "FEED_AUTO_HIDE_FAILED", detail: feedUpdate.error.message }, 500);
    }

    const autoHideEvent = await supabase.from("la_activity_events").insert({
      event_type: "community_content_auto_hidden",
      actor_user_id: null,
      actor_user_key: null,
      school_id: Number(target.data.school_id),
      target_type: communityTargetType,
      target_id: targetId,
      idempotency_key: `community_content_auto_hidden:${communityTargetType}:${targetId}`,
      payload: { reason: "report_threshold", report_threshold: 3, unique_reporters: uniqueReporters.size },
    });
    if (autoHideEvent.error && autoHideEvent.error.code !== "23505") {
      return json({ error: "AUTO_HIDE_EVENT_INSERT_FAILED", detail: autoHideEvent.error.message }, 500);
    }
    auto_hidden = true;
  }

  return json({ ok: true, report: report.data, auto_hidden, unique_reporters: uniqueReporters.size });
});
