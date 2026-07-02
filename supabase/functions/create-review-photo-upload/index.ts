import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID") || "9fbd18dbefe5c39717909da09b9165cf";
const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID") || "";
const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
const R2_BUCKET = Deno.env.get("LUNCH_ARENA_R2_BUCKET") || "lunch-arena";
const MAX_BYTES = 2_000_000;
const EXPIRES_IN = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type UploadRequest = {
  user_key?: string;
  school_id?: number;
  meal_id?: number;
  file_name?: string | null;
  mime_type?: string;
  byte_size?: number;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
}

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function extensionFor(fileName: string | null | undefined, mimeType: string) {
  const explicit = String(fileName || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  if (explicit && ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(explicit)) {
    return explicit === "jpeg" ? "jpg" : explicit;
  }
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return byMime[mimeType] || "jpg";
}

function datePath() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ error: "SUPABASE_NOT_CONFIGURED" }, 500);
  }
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return json({ error: "R2_NOT_CONFIGURED" }, 500);
  }

  let body: UploadRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const userKey = String(body.user_key || "").trim();
  const schoolId = Number(body.school_id);
  const mealId = Number(body.meal_id);
  const mimeType = String(body.mime_type || "").trim();
  const byteSize = Number(body.byte_size || 0);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!isPositiveInteger(schoolId)) return json({ error: "INVALID_SCHOOL_ID" }, 400);
  if (!isPositiveInteger(mealId)) return json({ error: "INVALID_MEAL_ID" }, 400);
  if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(mimeType)) {
    return json({ error: "INVALID_PHOTO_MIME_TYPE" }, 400);
  }
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > MAX_BYTES) {
    return json({ error: "INVALID_PHOTO_SIZE", max_byte_size: MAX_BYTES }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const selectedSchool = await supabase
    .from("user_schools")
    .select("school_id")
    .eq("user_key", userKey)
    .maybeSingle();

  if (selectedSchool.error) return json({ error: "USER_SCHOOL_LOOKUP_FAILED" }, 500);
  if (!selectedSchool.data?.school_id || Number(selectedSchool.data.school_id) !== schoolId) {
    return json({ error: "SCHOOL_OWNERSHIP_REQUIRED" }, 403);
  }

  const meal = await supabase
    .from("meals")
    .select("id,school_id")
    .eq("id", mealId)
    .maybeSingle();

  if (meal.error) return json({ error: "MEAL_LOOKUP_FAILED" }, 500);
  if (!meal.data?.id) return json({ error: "MEAL_NOT_FOUND" }, 404);
  if (Number(meal.data.school_id) !== schoolId) return json({ error: "MEAL_SCHOOL_MISMATCH" }, 400);

  const ext = extensionFor(body.file_name, mimeType);
  const objectKey = [
    "review-photos",
    String(schoolId),
    String(mealId),
    datePath(),
    `${crypto.randomUUID()}.${ext}`,
  ].join("/");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
    ContentLength: byteSize,
    Metadata: {
      school_id: String(schoolId),
      meal_id: String(mealId),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });

  return json({
    ok: true,
    upload_url: uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    bucket_name: R2_BUCKET,
    object_key: objectKey,
    mime_type: mimeType,
    byte_size: byteSize,
    expires_in: EXPIRES_IN,
    max_byte_size: MAX_BYTES,
  });
});
