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

  const reviewId = Number(body.review_id);
  const userKey = String(body.user_key || "").trim();

  if (!Number.isInteger(reviewId) || reviewId <= 0) return json({ error: "INVALID_REVIEW_ID" }, 400);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const existing = await supabase
    .from("la_reviews")
    .select("id,user_key,meal_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (existing.error) return json({ error: "REVIEW_LOOKUP_FAILED", detail: existing.error.message }, 500);
  if (!existing.data?.id) return json({ error: "REVIEW_NOT_FOUND" }, 404);
  if (existing.data.user_key !== userKey) return json({ error: "OWNER_REQUIRED" }, 403);

  const deleted = await supabase
    .from("la_reviews")
    .delete()
    .eq("id", reviewId)
    .select("id,meal_id")
    .single();

  if (deleted.error) return json({ error: "REVIEW_DELETE_FAILED", detail: deleted.error.message }, 500);

  return json({ ok: true, review: deleted.data });
});
