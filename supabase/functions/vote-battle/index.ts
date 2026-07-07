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

  const battleId = Number(body.battle_id);
  const votedSchoolId = Number(body.voted_school_id);
  const userKey = String(body.user_key || "").trim();

  if (!Number.isInteger(battleId) || battleId <= 0) return json({ error: "INVALID_BATTLE_ID" }, 400);
  if (!Number.isInteger(votedSchoolId) || votedSchoolId <= 0) return json({ error: "INVALID_SCHOOL_ID" }, 400);
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const battle = await supabase
    .from("la_battles")
    .select("id,school_a_id,school_b_id,vote_a,vote_b")
    .eq("id", battleId)
    .maybeSingle();
  if (battle.error) return json({ error: "BATTLE_LOOKUP_FAILED", detail: battle.error.message }, 500);
  if (!battle.data?.id) return json({ error: "BATTLE_NOT_FOUND" }, 404);

  const isA = Number(battle.data.school_a_id) === votedSchoolId;
  const isB = Number(battle.data.school_b_id) === votedSchoolId;
  if (!isA && !isB) return json({ error: "INVALID_VOTED_SCHOOL" }, 400);

  const inserted = await supabase
    .from("la_battle_votes")
    .insert({ battle_id: battleId, voted_school_id: votedSchoolId, user_key: userKey });
  if (inserted.error?.code === "23505") return json({ error: "ALREADY_VOTED" }, 409);
  if (inserted.error) return json({ error: "VOTE_INSERT_FAILED", detail: inserted.error.message }, 500);

  const nextVoteA = Number(battle.data.vote_a || 0) + (isA ? 1 : 0);
  const nextVoteB = Number(battle.data.vote_b || 0) + (isB ? 1 : 0);
  const updated = await supabase
    .from("la_battles")
    .update({ vote_a: nextVoteA, vote_b: nextVoteB })
    .eq("id", battleId)
    .select("id,vote_a,vote_b")
    .single();
  if (updated.error) return json({ error: "BATTLE_VOTE_UPDATE_FAILED", detail: updated.error.message }, 500);

  return json({ ok: true, battle: updated.data });
});
