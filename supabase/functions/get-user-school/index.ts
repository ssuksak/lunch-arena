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

  const userKey = String(body.user_key || "").trim();
  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const key = await supabase
    .from("la_user_keys")
    .select("user_id")
    .eq("user_key", userKey)
    .maybeSingle();
  if (key.error) return json({ error: "USER_KEY_LOOKUP_FAILED", detail: key.error.message }, 500);
  if (!key.data?.user_id) return json({ ok: true, user_key: userKey, profile: null, membership: null, school: null });

  const [profile, membership] = await Promise.all([
    supabase
      .from("la_user_profiles")
      .select("display_name,selected_school_id,last_seen_at")
      .eq("user_id", key.data.user_id)
      .maybeSingle(),
    supabase
      .from("la_user_school_memberships")
      .select("school_id,role,is_current,started_at")
      .eq("user_id", key.data.user_id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  if (profile.error) return json({ error: "PROFILE_LOOKUP_FAILED", detail: profile.error.message }, 500);
  if (membership.error) return json({ error: "MEMBERSHIP_LOOKUP_FAILED", detail: membership.error.message }, 500);

  let school = null;
  if (membership.data?.school_id) {
    const schoolResult = await supabase
      .from("schools")
      .select("id,name,type,address,atpt_code,school_code")
      .eq("id", Number(membership.data.school_id))
      .maybeSingle();
    if (schoolResult.error) return json({ error: "SCHOOL_LOOKUP_FAILED", detail: schoolResult.error.message }, 500);
    school = schoolResult.data || null;
  }

  return json({
    ok: true,
    user_key: userKey,
    user_id: key.data.user_id,
    profile: profile.data || null,
    membership: membership.data || null,
    school,
  });
});
