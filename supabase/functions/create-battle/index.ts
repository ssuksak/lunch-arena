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
function intValue(value: unknown) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
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
  const battleDate = String(body.battle_date || "").trim();
  const schoolAId = intValue(body.school_a_id);
  const schoolBId = intValue(body.school_b_id);
  const mealAId = intValue(body.meal_a_id);
  const mealBId = intValue(body.meal_b_id);
  const scoreA = Number(body.score_a);
  const scoreB = Number(body.score_b);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(battleDate)) return json({ error: "INVALID_BATTLE_DATE" }, 400);
  if (!schoolAId || !schoolBId || schoolAId === schoolBId) return json({ error: "INVALID_SCHOOLS" }, 400);
  if (!mealAId || !mealBId) return json({ error: "INVALID_MEALS" }, 400);
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return json({ error: "INVALID_SCORES" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const battle = await supabase
    .from("la_battles")
    .upsert({
      battle_date: battleDate,
      school_a_id: schoolAId,
      school_b_id: schoolBId,
      meal_a_id: mealAId,
      meal_b_id: mealBId,
      score_a: scoreA,
      score_b: scoreB,
    }, { onConflict: "battle_date,school_a_id,school_b_id" })
    .select("id,battle_date,school_a_id,school_b_id,meal_a_id,meal_b_id,score_a,score_b,vote_a,vote_b")
    .single();
  if (battle.error) return json({ error: "BATTLE_UPSERT_FAILED", detail: battle.error.message }, 500);

  return json({ ok: true, battle: battle.data });
});
