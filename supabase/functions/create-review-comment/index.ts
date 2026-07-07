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

  const ratingId = Number(body.rating_id);
  const userKey = String(body.user_key || "").trim();
  const nickname = cleanText(body.nickname, 12);
  const comment = cleanText(body.comment, 300);

  if (!Number.isInteger(ratingId) || ratingId <= 0) return json({ error: "INVALID_RATING_ID" }, 400);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (nickname && nickname.length < 2) return json({ error: "INVALID_NICKNAME" }, 400);
  if (!comment) return json({ error: "INVALID_COMMENT" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const review = await supabase
    .from("la_reviews")
    .select("id")
    .eq("id", ratingId)
    .maybeSingle();
  if (review.error) return json({ error: "REVIEW_LOOKUP_FAILED", detail: review.error.message }, 500);
  if (!review.data?.id) return json({ error: "REVIEW_NOT_FOUND" }, 404);

  const inserted = await supabase
    .from("la_review_comments")
    .insert({ rating_id: ratingId, user_key: userKey, nickname, comment })
    .select("id,rating_id,user_key,nickname,comment,created_at")
    .single();
  if (inserted.error) return json({ error: "COMMENT_INSERT_FAILED", detail: inserted.error.message }, 500);

  return json({ ok: true, comment: inserted.data });
});
