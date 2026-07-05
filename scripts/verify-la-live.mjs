import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SUPABASE_URL = "https://puwthqzbounohrdmacgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0";
const ORIGIN = "http://localhost:5173";
const SCHOOL_ID = 1863;
const MEAL_ID = 649978;

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

const RUN_ID = stamp();
const userKey = `fp_liveverify_${RUN_ID}`;
const reporterKey = `fp_liveverify_reporter_${RUN_ID}`;
const deleteUserKey = `fp_liveverify_delete_${RUN_ID}`;

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail ? `\n${JSON.stringify(detail, null, 2)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

async function edge(name, body) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  json._status = response.status;
  return json;
}

async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

async function preflight(name) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "apikey,authorization,content-type",
    },
  });
  const allowHeaders = response.headers.get("access-control-allow-headers") || "";
  assert(response.ok, `${name} CORS preflight failed`, { status: response.status, allowHeaders });
  assert(/apikey/i.test(allowHeaders), `${name} CORS missing apikey`, { allowHeaders });
}

function sqlQuery(sql) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const dir = mkdtempSync(join(tmpdir(), "la-live-sql-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, sql, "utf8");
  let output = "";
  try {
    output = execFileSync(
      npx,
      ["--yes", "supabase", "db", "query", "--linked", "--file", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  assert(start >= 0 && end > start, "Could not parse supabase db query output", { output });
  return JSON.parse(output.slice(start, end + 1));
}

async function putTinyPng(uploadUrl, contentType) {
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: tinyPng,
  });
  assert(response.ok, "R2 PUT failed", { status: response.status, text: await response.text().catch(() => "") });
  return { etag: response.headers.get("etag"), byteSize: tinyPng.length };
}

async function main() {
  const functions = [
    "set-user-school",
    "sync-meals",
    "create-community-post",
    "create-community-comment",
    "react-community",
    "report-community-content",
    "delete-community-content",
    "create-review-photo-upload",
    "submit-review",
    "review-photo-urls",
  ];
  for (const fn of functions) await preflight(fn);

  const school = await edge("set-user-school", {
    user_key: userKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "실검증",
    idempotency_key: `liveverify:set-school:${RUN_ID}`,
  });
  assert(school.ok && school.school?.id === SCHOOL_ID, "set-user-school failed", school);

  const reporterSchool = await edge("set-user-school", {
    user_key: reporterKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "신고검증",
    idempotency_key: `liveverify:set-reporter-school:${RUN_ID}`,
  });
  assert(reporterSchool.ok && reporterSchool.school?.id === SCHOOL_ID, "reporter set-user-school failed", reporterSchool);

  const deleteUserSchool = await edge("set-user-school", {
    user_key: deleteUserKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "삭제검증",
    idempotency_key: `liveverify:set-delete-user-school:${RUN_ID}`,
  });
  assert(deleteUserSchool.ok && deleteUserSchool.school?.id === SCHOOL_ID, "delete user set-user-school failed", deleteUserSchool);

  const meals = await edge("sync-meals", {
    atpt_code: "D10",
    school_code: "7240085",
    date: "2026-07-06",
  });
  assert(!meals.error, "sync-meals failed", meals);

  const postResult = await edge("create-community-post", {
    user_key: userKey,
    source: "fp",
    title: `라이브 검증 ${RUN_ID}`,
    body: "커뮤니티 게시글 라이브 검증입니다.",
    anonymous_name: "실검증",
    idempotency_key: `liveverify:post:${RUN_ID}`,
  });
  assert(postResult.ok && postResult.post?.id, "create-community-post failed", postResult);
  const postId = postResult.post.id;

  const commentResult = await edge("create-community-comment", {
    user_key: userKey,
    source: "fp",
    post_id: postId,
    body: "댓글 라이브 검증입니다.",
    anonymous_name: "실검증",
    idempotency_key: `liveverify:comment:${RUN_ID}`,
  });
  assert(commentResult.ok && commentResult.comment?.id, "create-community-comment failed", commentResult);
  const commentId = commentResult.comment.id;

  const reaction = await edge("react-community", {
    user_key: userKey,
    target_type: "post",
    target_id: postId,
    idempotency_key: `liveverify:reaction:${RUN_ID}`,
  });
  assert(reaction.ok && reaction.selected === true, "react-community failed", reaction);

  const report = await edge("report-community-content", {
    user_key: reporterKey,
    target_type: "post",
    target_id: postId,
    reason: "test",
    details: "라이브 검증 신고입니다.",
  });
  assert(report.ok && report.report?.id, "report-community-content failed", report);

  const deletedComment = await edge("delete-community-content", {
    user_key: userKey,
    target_type: "comment",
    target_id: commentId,
  });
  assert(deletedComment.ok, "delete-community-content failed", deletedComment);

  const uploadTicket = await edge("create-review-photo-upload", {
    user_key: userKey,
    school_id: SCHOOL_ID,
    meal_id: MEAL_ID,
    file_name: `liveverify-${RUN_ID}.png`,
    mime_type: "image/png",
    byte_size: 68,
  });
  assert(uploadTicket.ok && uploadTicket.upload_url, "create-review-photo-upload failed", uploadTicket);
  const upload = await putTinyPng(uploadTicket.upload_url, "image/png");

  const review = await edge("submit-review", {
    user_key: userKey,
    source: "fp",
    meal_id: MEAL_ID,
    school_id: SCHOOL_ID,
    score: 5,
    nickname: "실검증",
    comment: `라이브 리뷰 검증 ${RUN_ID}`,
    selected_menu_item: "검증메뉴",
    idempotency_key: `liveverify:review:${RUN_ID}`,
    photo: {
      bucket_name: uploadTicket.bucket_name,
      object_key: uploadTicket.object_key,
      public_url: null,
      thumbnail_object_key: null,
      mime_type: "image/png",
      byte_size: upload.byteSize,
      width: 1,
      height: 1,
      r2_etag: upload.etag,
    },
  });
  assert(review.ok && review.rating?.id && review.review_photo?.id, "submit-review failed", review);
  const ratingId = review.rating.id;

  const photoUrls = await edge("review-photo-urls", {
    user_key: userKey,
    rating_ids: [ratingId],
  });
  assert(photoUrls.ok && photoUrls.photos?.[String(ratingId)]?.url, "review-photo-urls failed", photoUrls);

  const editedReview = await rest(`ratings?id=eq.${ratingId}&user_key=eq.${encodeURIComponent(userKey)}&select=id,comment,score`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
      "x-review-owner-key": userKey,
    },
    body: JSON.stringify({
      score: 4,
      comment: `라이브 리뷰 수정 검증 ${RUN_ID}`,
      selected_menu_item: "수정검증메뉴",
      nickname: "실검증",
    }),
  });
  assert(editedReview.ok && Array.isArray(editedReview.body) && editedReview.body[0]?.score === 4, "review edit REST failed", editedReview);

  const reviewReaction = await rest("review_reactions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      rating_id: ratingId,
      user_key: userKey,
      nickname: "실검증",
      reaction: "like",
      cancel_token_hash: "a".repeat(64),
    }),
  });
  assert(reviewReaction.ok || reviewReaction.status === 409, "review reaction REST failed", reviewReaction);

  const reviewComment = await rest("review_comments", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      rating_id: ratingId,
      user_key: userKey,
      nickname: "실검증",
      comment: `리뷰 댓글 라이브 검증 ${RUN_ID}`,
    }),
  });
  assert(reviewComment.ok, "review comment REST failed", reviewComment);

  const deletedReaction = await rest(`review_reactions?rating_id=eq.${ratingId}&user_key=eq.${encodeURIComponent(userKey)}&select=id`, {
    method: "DELETE",
    headers: {
      Prefer: "return=representation",
      "x-reaction-cancel-token-hash": "a".repeat(64),
    },
  });
  assert(deletedReaction.ok && Array.isArray(deletedReaction.body) && deletedReaction.body.length === 1, "review reaction delete REST failed", deletedReaction);

  const deleteReview = await edge("submit-review", {
    user_key: deleteUserKey,
    source: "fp",
    meal_id: MEAL_ID,
    school_id: SCHOOL_ID,
    score: 3,
    nickname: "삭제검증",
    comment: `삭제될 리뷰 검증 ${RUN_ID}`,
    idempotency_key: `liveverify:delete-review:${RUN_ID}`,
  });
  assert(deleteReview.ok && deleteReview.rating?.id, "delete test submit-review failed", deleteReview);
  const deleteRatingId = deleteReview.rating.id;
  const deletedReview = await rest(`ratings?id=eq.${deleteRatingId}&user_key=eq.${encodeURIComponent(deleteUserKey)}&select=id`, {
    method: "DELETE",
    headers: {
      Prefer: "return=representation",
      "x-review-owner-key": deleteUserKey,
    },
  });
  assert(deletedReview.ok && Array.isArray(deletedReview.body) && deletedReview.body.length === 1, "review delete REST failed", deletedReview);

  const verification = sqlQuery(`
    select
      (select count(*) from public.la_user_keys where user_key in ('${userKey}', '${reporterKey}', '${deleteUserKey}')) as la_user_keys,
      (select count(*) from public.la_user_school_memberships where user_key in ('${userKey}', '${reporterKey}', '${deleteUserKey}') and school_id = ${SCHOOL_ID}) as la_memberships,
      (select count(*) from public.la_community_posts where id = '${postId}' and school_id = ${SCHOOL_ID}) as la_posts,
      (select count(*) from public.la_community_comments where id = '${commentId}' and school_id = ${SCHOOL_ID} and visibility = 'deleted') as la_deleted_comments,
      (select count(*) from public.la_community_reactions where post_id = '${postId}' and user_key = '${userKey}') as la_reactions,
      (select count(*) from public.la_moderation_reports where target_id = '${postId}' and reporter_user_key = '${reporterKey}') as la_reports,
      (select count(*) from public.ratings where id = ${ratingId} and user_key = '${userKey}' and school_id = ${SCHOOL_ID}) as ratings,
      (select count(*) from public.ratings where id = ${ratingId} and score = 4 and comment = '라이브 리뷰 수정 검증 ${RUN_ID}') as rating_edits,
      (select count(*) from public.review_reactions where rating_id = ${ratingId} and user_key = '${userKey}' and reaction = 'like') as review_reactions,
      (select count(*) from public.review_comments where rating_id = ${ratingId} and user_key = '${userKey}') as review_comments,
      (select count(*) from public.ratings where id = ${deleteRatingId}) as deleted_ratings,
      (select count(*) from public.la_review_photos where rating_id = ${ratingId} and owner_user_key = '${userKey}') as la_review_photos,
      (select count(*) from public.la_activity_events where actor_user_key in ('${userKey}', '${reporterKey}', '${deleteUserKey}')) as la_activity_events;
  `);
  const row = verification.rows?.[0] || {};
  assert(row.la_user_keys === 3, "DB verification failed: la_user_keys", row);
  assert(row.la_memberships === 3, "DB verification failed: la_user_school_memberships", row);
  assert(row.la_posts === 1, "DB verification failed: la_community_posts", row);
  assert(row.la_deleted_comments === 1, "DB verification failed: la_community_comments delete state", row);
  assert(row.la_reactions === 1, "DB verification failed: la_community_reactions", row);
  assert(row.la_reports === 1, "DB verification failed: la_moderation_reports", row);
  assert(row.ratings === 1, "DB verification failed: ratings", row);
  assert(row.rating_edits === 1, "DB verification failed: ratings edit", row);
  assert(row.review_reactions === 0, "DB verification failed: review_reactions delete", row);
  assert(row.review_comments === 1, "DB verification failed: review_comments", row);
  assert(row.deleted_ratings === 0, "DB verification failed: ratings delete", row);
  assert(row.la_review_photos === 1, "DB verification failed: la_review_photos", row);
  assert(Number(row.la_activity_events || 0) >= 6, "DB verification failed: la_activity_events", row);

  console.log(JSON.stringify({
    ok: true,
    run_id: RUN_ID,
    inspect: {
      user_key: userKey,
      reporter_key: reporterKey,
      delete_user_key: deleteUserKey,
      school_id: SCHOOL_ID,
      meal_id: MEAL_ID,
      post_id: postId,
      comment_id: commentId,
      rating_id: ratingId,
      photo_object_key: uploadTicket.object_key,
    },
    db_counts: row,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
