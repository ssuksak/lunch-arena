import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

type Body = {
  user_key?: string;
  source?: string;
  school_id?: number;
  nickname?: string | null;
  idempotency_key?: string | null;
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
  const existingKey = await supabase
    .from("la_user_keys")
    .select("user_id")
    .eq("user_key", userKey)
    .maybeSingle();

  if (existingKey.data?.user_id) return existingKey.data.user_id as string;

  const insertedUser = await supabase
    .from("la_users")
    .insert({
      primary_user_key: userKey,
      metadata: { created_by: "set-user-school" },
    })
    .select("id")
    .single();

  let userId = insertedUser.data?.id as string | undefined;
  if (insertedUser.error) {
    const fallback = await supabase
      .from("la_users")
      .select("id")
      .eq("primary_user_key", userKey)
      .maybeSingle();
    if (fallback.error || !fallback.data?.id) {
      throw new Error(`USER_CREATE_FAILED:${insertedUser.error.message}`);
    }
    userId = fallback.data.id as string;
  }

  const insertedKey = await supabase.from("la_user_keys").insert({
    user_key: userKey,
    user_id: userId,
    source,
    is_primary: true,
    verified_at: new Date().toISOString(),
    metadata: { created_by: "set-user-school" },
  });
  if (insertedKey.error && insertedKey.error.code !== "23505") {
    throw new Error(`USER_KEY_CREATE_FAILED:${insertedKey.error.message}`);
  }

  return userId!;
}

async function syncCurrentSchoolMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userKey: string,
  schoolId: number,
) {
  const current = await supabase
    .from("la_user_school_memberships")
    .select("id,school_id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (current.error) throw new Error(`MEMBERSHIP_LOOKUP_FAILED:${current.error.message}`);
  if (current.data?.school_id && Number(current.data.school_id) === schoolId) {
    return { changed: false, previous_school_id: Number(current.data.school_id) };
  }

  const now = new Date().toISOString();
  const previousSchoolId = current.data?.school_id ? Number(current.data.school_id) : null;

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
    source: "profile",
    metadata: { created_by: "set-user-school" },
  });
  if (inserted.error) throw new Error(`MEMBERSHIP_CREATE_FAILED:${inserted.error.message}`);
  return { changed: true, previous_school_id: previousSchoolId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: "SERVER_NOT_CONFIGURED" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const userKey = String(body.user_key || "").trim();
  const source = normalizeSource(body.source, userKey);
  const schoolId = Number(body.school_id);
  const nickname = cleanText(body.nickname, 12);
  const idempotencyKey = cleanText(body.idempotency_key, 180);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!source) return json({ error: "INVALID_SOURCE" }, 400);
  if (!Number.isInteger(schoolId) || schoolId <= 0) return json({ error: "INVALID_SCHOOL_ID" }, 400);
  if (nickname && nickname.length < 2) return json({ error: "INVALID_NICKNAME" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const school = await supabase
    .from("la_schools")
    .select("id,name,type,address,atpt_code,school_code")
    .eq("id", schoolId)
    .maybeSingle();
  if (school.error) return json({ error: "SCHOOL_LOOKUP_FAILED", detail: school.error.message }, 500);
  if (!school.data?.id) return json({ error: "SCHOOL_NOT_FOUND" }, 404);

  try {
    const now = new Date().toISOString();
    const userId = await resolveUser(supabase, userKey, source);

    const profile = await supabase.from("la_user_profiles").upsert({
      user_id: userId,
      display_name: nickname,
      selected_school_id: schoolId,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: "user_id" });
    if (profile.error) return json({ error: "PROFILE_UPSERT_FAILED", detail: profile.error.message }, 500);

    const membership = await syncCurrentSchoolMembership(supabase, userId, userKey, schoolId);
    const eventKey = idempotencyKey || `school_changed:${userKey}:${schoolId}`;
    const event = await supabase.from("la_activity_events").insert({
      event_type: "school_changed",
      actor_user_id: userId,
      actor_user_key: userKey,
      school_id: schoolId,
      target_type: "school",
      target_id: String(schoolId),
      idempotency_key: eventKey,
      payload: {
        previous_school_id: membership.previous_school_id,
        changed: membership.changed,
        source: "set-user-school",
      },
    }).select("id").single();
    if (event.error && event.error.code !== "23505") {
      return json({ error: "EVENT_INSERT_FAILED", detail: event.error.message }, 500);
    }

    return json({
      ok: true,
      user_key: userKey,
      user_id: userId,
      school: school.data,
      membership_changed: membership.changed,
      event_id: event.data?.id || null,
    });
  } catch (error) {
    return json({ error: "SET_USER_SCHOOL_FAILED", detail: String(error instanceof Error ? error.message : error) }, 500);
  }
});
