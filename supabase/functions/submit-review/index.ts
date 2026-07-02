import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const R2_BUCKET = Deno.env.get("LUNCH_ARENA_R2_BUCKET") || "lunch-arena";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type ReviewPhotoInput = {
  bucket_name?: string;
  object_key?: string;
  public_url?: string | null;
  thumbnail_object_key?: string | null;
  mime_type?: string;
  byte_size?: number;
  width?: number | null;
  height?: number | null;
  r2_etag?: string | null;
};

type SubmitReviewBody = {
  user_key?: string;
  source?: string;
  meal_id?: number;
  school_id?: number;
  score?: number;
  comment?: string | null;
  nickname?: string | null;
  selected_menu_item?: string | null;
  idempotency_key?: string | null;
  photo?: ReviewPhotoInput | null;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeSource(value: unknown, userKey: string) {
  const source = String(value || "").trim();
  if (source === "toss" || source === "fp") return source;
  if (userKey.startsWith("toss_")) return "toss";
  if (userKey.startsWith("fp_")) return "fp";
  return "";
}

function validateUserKey(userKey: string) {
  return /^(toss_|fp_)[A-Za-z0-9_-]{8,128}$/.test(userKey);
}

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function nullablePositiveInteger(value: unknown, fieldName: string) {
  if (value == null || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`INVALID_${fieldName}`);
  }
  return numberValue;
}

function sanitizePhoto(photo: ReviewPhotoInput | null | undefined) {
  if (!photo) return null;
  const bucketName = String(photo.bucket_name || R2_BUCKET).trim();
  const objectKey = String(photo.object_key || "").trim();
  const mimeType = String(photo.mime_type || "").trim();
  const byteSize = Number(photo.byte_size || 0);

  if (bucketName !== R2_BUCKET) {
    throw new Error("INVALID_PHOTO_BUCKET");
  }
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("..")) {
    throw new Error("INVALID_PHOTO_OBJECT_KEY");
  }
  if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(mimeType)) {
    throw new Error("INVALID_PHOTO_MIME_TYPE");
  }
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > 2_000_000) {
    throw new Error("INVALID_PHOTO_SIZE");
  }

  return {
    bucket_name: bucketName,
    object_key: objectKey,
    public_url: cleanText(photo.public_url, 2048),
    thumbnail_object_key: cleanText(photo.thumbnail_object_key, 1024),
    mime_type: mimeType,
    byte_size: byteSize,
    width: nullablePositiveInteger(photo.width, "PHOTO_WIDTH"),
    height: nullablePositiveInteger(photo.height, "PHOTO_HEIGHT"),
    r2_etag: cleanText(photo.r2_etag, 256),
  };
}

async function resolveUser(supabase: ReturnType<typeof createClient>, userKey: string, source: string) {
  const existingKey = await supabase
    .from("la_user_keys")
    .select("user_id")
    .eq("user_key", userKey)
    .maybeSingle();

  if (existingKey.data?.user_id) {
    return existingKey.data.user_id as string;
  }

  const insertedUser = await supabase
    .from("la_users")
    .insert({
      primary_user_key: userKey,
      metadata: { created_by: "submit-review" },
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

  const insertedKey = await supabase
    .from("la_user_keys")
    .insert({
      user_key: userKey,
      user_id: userId,
      source,
      is_primary: true,
      verified_at: new Date().toISOString(),
      metadata: { created_by: "submit-review" },
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

  if (current.error) {
    throw new Error(`MEMBERSHIP_LOOKUP_FAILED:${current.error.message}`);
  }

  if (current.data?.school_id && Number(current.data.school_id) === schoolId) return;

  const now = new Date().toISOString();

  if (current.data?.id) {
    const closed = await supabase
      .from("la_user_school_memberships")
      .update({ is_current: false, ended_at: now, updated_at: now })
      .eq("id", current.data.id);

    if (closed.error) {
      throw new Error(`MEMBERSHIP_CLOSE_FAILED:${closed.error.message}`);
    }
  }

  const inserted = await supabase
    .from("la_user_school_memberships")
    .insert({
      user_id: userId,
      school_id: schoolId,
      user_key: userKey,
      role: "student",
      is_current: true,
      metadata: { created_by: "submit-review" },
    });

  if (inserted.error) {
    throw new Error(`MEMBERSHIP_CREATE_FAILED:${inserted.error.message}`);
  }
}

async function cleanupReviewWrite(
  supabase: ReturnType<typeof createClient>,
  ratingId: number | null,
  idempotencyKeys: string[],
) {
  for (const key of idempotencyKeys.filter(Boolean)) {
    await supabase.from("la_activity_events").delete().eq("idempotency_key", key);
  }
  if (ratingId) {
    await supabase.from("ratings").delete().eq("id", ratingId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ error: "SERVER_NOT_CONFIGURED" }, 500);
  }

  let body: SubmitReviewBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const userKey = String(body.user_key || "").trim();
  const source = normalizeSource(body.source, userKey);
  const mealId = Number(body.meal_id);
  const schoolId = Number(body.school_id);
  const score = Number(body.score);
  const nickname = cleanText(body.nickname, 12);
  const comment = cleanText(body.comment, 100);
  const selectedMenuItem = cleanText(body.selected_menu_item, 120);

  if (!validateUserKey(userKey)) return json({ error: "INVALID_USER_KEY" }, 400);
  if (!source) return json({ error: "INVALID_SOURCE" }, 400);
  if (!isPositiveInteger(mealId)) return json({ error: "INVALID_MEAL_ID" }, 400);
  if (!isPositiveInteger(schoolId)) return json({ error: "INVALID_SCHOOL_ID" }, 400);
  if (!Number.isInteger(score) || score < 1 || score > 5) return json({ error: "INVALID_SCORE" }, 400);
  if (nickname && nickname.length < 2) return json({ error: "INVALID_NICKNAME" }, 400);

  let photo: ReturnType<typeof sanitizePhoto> = null;
  try {
    photo = sanitizePhoto(body.photo);
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 400);
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

  try {
    const userId = await resolveUser(supabase, userKey, source);
    let ratingId: number | null = null;
    const createdEventKeys: string[] = [];

    const profile = await supabase
      .from("la_user_profiles")
      .upsert({
        user_id: userId,
        display_name: nickname,
        selected_school_id: schoolId,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (profile.error) {
      return json({ error: "PROFILE_UPSERT_FAILED", detail: profile.error.message }, 500);
    }

    await syncCurrentSchoolMembership(supabase, userId, userKey, schoolId);

    const ratingBody: Record<string, unknown> = {
      meal_id: mealId,
      school_id: schoolId,
      score,
      user_key: userKey,
      nickname,
    };
    if (comment) ratingBody.comment = comment;
    if (selectedMenuItem) ratingBody.selected_menu_item = selectedMenuItem;
    if (photo?.public_url) ratingBody.photo_url = photo.public_url;

    const rating = await supabase
      .from("ratings")
      .insert(ratingBody)
      .select("id,meal_id,school_id,score,comment,selected_menu_item,photo_url,created_at,user_key,nickname")
      .single();

    if (rating.error) {
      if (rating.error.code === "23505") return json({ error: "REVIEW_ALREADY_EXISTS" }, 409);
      return json({ error: "RATING_INSERT_FAILED", detail: rating.error.message }, 500);
    }

    ratingId = Number(rating.data.id);
    const eventIdempotencyKey = cleanText(body.idempotency_key, 180) || `review_created:${ratingId}`;
    createdEventKeys.push(eventIdempotencyKey);

    const event = await supabase
      .from("la_activity_events")
      .insert({
        event_type: "review_created",
        actor_user_id: userId,
        actor_user_key: userKey,
        school_id: schoolId,
        meal_id: mealId,
        rating_id: ratingId,
        target_type: "rating",
        target_id: String(ratingId),
        idempotency_key: eventIdempotencyKey,
        payload: {
          score,
          has_comment: Boolean(comment),
          has_photo: Boolean(photo),
          selected_menu_item: selectedMenuItem,
        },
      })
      .select("id")
      .single();

    if (event.error?.code === "23505") {
      await cleanupReviewWrite(supabase, ratingId, []);
      return json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, 409);
    }

    if (event.error) {
      await cleanupReviewWrite(supabase, ratingId, createdEventKeys);
      return json({ error: "EVENT_INSERT_FAILED", detail: event.error.message }, 500);
    }

    let reviewPhoto = null;
    if (photo) {
      const photoRow = await supabase
        .from("la_review_photos")
        .insert({
          rating_id: ratingId,
          school_id: schoolId,
          meal_id: mealId,
          owner_user_id: userId,
          owner_user_key: userKey,
          storage_provider: "r2",
          bucket_name: photo.bucket_name,
          object_key: photo.object_key,
          public_url: photo.public_url,
          thumbnail_object_key: photo.thumbnail_object_key,
          mime_type: photo.mime_type,
          byte_size: photo.byte_size,
          width: photo.width,
          height: photo.height,
          status: "pending",
          moderation_status: "unreviewed",
          metadata: {
            r2_etag: photo.r2_etag,
            source_event_id: event.data?.id || null,
          },
        })
        .select("id,bucket_name,object_key,status,moderation_status")
        .single();

      if (photoRow.error) {
        await cleanupReviewWrite(supabase, ratingId, createdEventKeys);
        return json({ error: "PHOTO_METADATA_INSERT_FAILED", detail: photoRow.error.message }, 500);
      }

      reviewPhoto = photoRow.data;
      const photoEventKey = `photo_uploaded:${ratingId}:${photo.object_key}`;

      const photoEvent = await supabase
        .from("la_activity_events")
        .insert({
          event_type: "photo_uploaded",
          actor_user_id: userId,
          actor_user_key: userKey,
          school_id: schoolId,
          meal_id: mealId,
          rating_id: ratingId,
          target_type: "photo",
          target_id: String(photoRow.data.id),
          idempotency_key: photoEventKey,
          payload: {
            bucket_name: photo.bucket_name,
            object_key: photo.object_key,
            mime_type: photo.mime_type,
            byte_size: photo.byte_size,
          },
        });

      if (photoEvent.error?.code === "23505") {
        await cleanupReviewWrite(supabase, ratingId, createdEventKeys);
        return json({ error: "PHOTO_IDEMPOTENCY_KEY_CONFLICT" }, 409);
      }

      if (photoEvent.error) {
        await cleanupReviewWrite(supabase, ratingId, createdEventKeys);
        return json({ error: "PHOTO_EVENT_INSERT_FAILED", detail: photoEvent.error.message }, 500);
      }

      createdEventKeys.push(photoEventKey);
    }

    return json({
      ok: true,
      rating: rating.data,
      review_photo: reviewPhoto,
      event_id: event.data?.id || null,
    });
  } catch (error) {
    return json({ error: "SUBMIT_REVIEW_FAILED", detail: String(error instanceof Error ? error.message : error) }, 500);
  }
});
