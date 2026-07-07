import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") || "9fbd18dbefe5c39717909da09b9165cf";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_BUCKET = Deno.env.get("LUNCH_ARENA_R2_BUCKET") || "lunch-arena";
const EXPIRES_IN = 300;
const MAX_RATING_IDS = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

type RequestBody = {
  rating_ids?: unknown;
  review_ids?: unknown;
  user_key?: string | null;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
}

function normalizeRatingIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = Array.from(new Set(value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  return ids.slice(0, MAX_RATING_IDS);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: "SUPABASE_NOT_CONFIGURED" }, 500);
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return json({ error: "R2_NOT_CONFIGURED" }, 500);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const ratingIds = normalizeRatingIds(body.review_ids || body.rating_ids);
  const userKey = String(body.user_key || "").trim();
  if (!ratingIds.length) return json({ ok: true, photos: {}, expires_in: EXPIRES_IN });
  if (userKey && !validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("la_review_photos")
    .select("id,review_id,rating_id,bucket_name,object_key,public_url,mime_type,status,moderation_status,owner_user_key,deleted_at,created_at")
    .in("review_id", ratingIds)
    .eq("storage_provider", "r2")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return json({ error: "PHOTO_LOOKUP_FAILED", detail: error.message }, 500);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const photos: Record<string, unknown> = {};
  for (const row of data || []) {
    const ratingId = String(row.review_id || row.rating_id);
    if (photos[ratingId]) continue;

    const isPublic = row.status === "active" && row.moderation_status === "approved";
    const isOwner = Boolean(userKey && row.owner_user_key === userKey);
    if (!isPublic && !isOwner) continue;
    if (row.bucket_name !== R2_BUCKET || !row.object_key) continue;

    const url = row.public_url || await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: row.bucket_name, Key: row.object_key }),
      { expiresIn: EXPIRES_IN },
    );

    photos[ratingId] = {
      id: row.id,
      url,
      bucket_name: row.bucket_name,
      object_key: row.object_key,
      mime_type: row.mime_type,
      status: row.status,
      moderation_status: row.moderation_status,
      expires_in: row.public_url ? null : EXPIRES_IN,
    };
  }

  return json({ ok: true, photos, expires_in: EXPIRES_IN });
});
