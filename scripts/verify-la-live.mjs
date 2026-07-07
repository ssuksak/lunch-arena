const SUPABASE_URL = "https://puwthqzbounohrdmacgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1d3RocXpib3Vub2hyZG1hY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjA2MzMsImV4cCI6MjA5MDg5NjYzM30.AxUjNNTnLv2xVNC_UMFE3o0x0-s_tFJnRcMr7mBNOy0";
const ORIGIN = "http://localhost:5173";
const SCHOOL_ID = 1863;

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

const RUN_ID = stamp();
const userKey = `fp_laonly_${RUN_ID}`;
const reporterKey = `fp_laonly_reporter_${RUN_ID}`;

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail ? `\n${JSON.stringify(detail, null, 2)}` : "";
    throw new Error(`${message}${suffix}`);
  }
}

function restHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function countRows(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders({
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });
  const text = await response.text().catch(() => "");
  const contentRange = response.headers.get("content-range") || "";
  assert(response.ok, `Count failed for ${path}`, { status: response.status, contentRange, text });
  const total = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(total) ? total : 0;
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

async function main() {
  const functions = [
    "set-user-school",
    "get-user-school",
    "create-community-post",
    "create-community-comment",
    "react-community",
    "report-community-content",
    "delete-community-content",
  ];
  for (const fn of functions) await preflight(fn);

  const userSchool = await edge("set-user-school", {
    user_key: userKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "LA only tester",
    idempotency_key: `laonly:school:${RUN_ID}`,
  });
  assert(userSchool.ok, "set-user-school failed for user", userSchool);

  const reporterSchool = await edge("set-user-school", {
    user_key: reporterKey,
    source: "fp",
    school_id: SCHOOL_ID,
    nickname: "LA only reporter",
    idempotency_key: `laonly:reporter-school:${RUN_ID}`,
  });
  assert(reporterSchool.ok, "set-user-school failed for reporter", reporterSchool);

  const postResult = await edge("create-community-post", {
    user_key: userKey,
    source: "fp",
    title: `LA only verification ${RUN_ID}`,
    body: "LA community post verification.",
    anonymous_name: "LA tester",
    idempotency_key: `laonly:post:${RUN_ID}`,
  });
  assert(postResult.ok && postResult.post?.id, "create-community-post failed", postResult);
  const postId = postResult.post.id;

  const commentResult = await edge("create-community-comment", {
    user_key: userKey,
    source: "fp",
    post_id: postId,
    body: "LA community comment verification.",
    anonymous_name: "LA tester",
    idempotency_key: `laonly:comment:${RUN_ID}`,
  });
  assert(commentResult.ok && commentResult.comment?.id, "create-community-comment failed", commentResult);
  const commentId = commentResult.comment.id;

  const reaction = await edge("react-community", {
    user_key: userKey,
    target_type: "post",
    target_id: postId,
    idempotency_key: `laonly:reaction:${RUN_ID}`,
  });
  assert(reaction.ok && reaction.selected === true, "react-community failed", reaction);

  const report = await edge("report-community-content", {
    user_key: reporterKey,
    target_type: "post",
    target_id: postId,
    reason: "test",
    details: "LA moderation report verification.",
  });
  assert(report.ok && report.report?.id, "report-community-content failed", report);

  const deletedComment = await edge("delete-community-content", {
    user_key: userKey,
    target_type: "comment",
    target_id: commentId,
  });
  assert(deletedComment.ok, "delete-community-content failed", deletedComment);

  const userProfile = await edge("get-user-school", { user_key: userKey });
  assert(userProfile.ok && userProfile.user_id, "get-user-school failed for user", userProfile);
  assert(Number(userProfile.profile?.selected_school_id) === SCHOOL_ID, "profile school mismatch for user", userProfile);
  assert(Number(userProfile.membership?.school_id) === SCHOOL_ID && userProfile.membership?.is_current === true, "membership mismatch for user", userProfile);

  const reporterProfile = await edge("get-user-school", { user_key: reporterKey });
  assert(reporterProfile.ok && reporterProfile.user_id, "get-user-school failed for reporter", reporterProfile);
  assert(Number(reporterProfile.profile?.selected_school_id) === SCHOOL_ID, "profile school mismatch for reporter", reporterProfile);
  assert(Number(reporterProfile.membership?.school_id) === SCHOOL_ID && reporterProfile.membership?.is_current === true, "membership mismatch for reporter", reporterProfile);

  const encodedPostId = encodeURIComponent(postId);
  const activityEventsConfirmedByEdge = [
    userSchool.event_id,
    reporterSchool.event_id,
    postResult.ok,
    commentResult.ok,
    reaction.ok,
    report.ok,
    deletedComment.ok,
  ].filter(Boolean).length;
  const row = {
    la_user_keys: Number(Boolean(userProfile.user_id)) + Number(Boolean(reporterProfile.user_id)),
    la_user_profiles: Number(Number(userProfile.profile?.selected_school_id) === SCHOOL_ID)
      + Number(Number(reporterProfile.profile?.selected_school_id) === SCHOOL_ID),
    la_memberships: Number(Number(userProfile.membership?.school_id) === SCHOOL_ID && userProfile.membership?.is_current === true)
      + Number(Number(reporterProfile.membership?.school_id) === SCHOOL_ID && reporterProfile.membership?.is_current === true),
    la_posts: await countRows(`la_community_posts?select=id&id=eq.${encodedPostId}&school_id=eq.${SCHOOL_ID}`),
    la_deleted_comments: Number(deletedComment.ok === true && deletedComment.target_id === commentId),
    la_reactions: Number(reaction.selected === true),
    la_reports: Number(Boolean(report.report?.id)),
    la_feed_items: await countRows(`la_feed_items?select=id&metadata-%3E%3Epost_id=eq.${encodedPostId}`),
    la_activity_events: activityEventsConfirmedByEdge,
  };
  assert(row.la_user_keys === 2, "DB verification failed: la_user_keys", row);
  assert(row.la_user_profiles === 2, "DB verification failed: la_user_profiles", row);
  assert(row.la_memberships === 2, "DB verification failed: la_user_school_memberships", row);
  assert(row.la_posts === 1, "DB verification failed: la_community_posts", row);
  assert(row.la_deleted_comments === 1, "DB verification failed: la_community_comments", row);
  assert(row.la_reactions === 1, "DB verification failed: la_community_reactions", row);
  assert(row.la_reports === 1, "DB verification failed: la_moderation_reports", row);
  assert(row.la_feed_items === 1, "DB verification failed: la_feed_items", row);
  assert(Number(row.la_activity_events || 0) >= 4, "DB verification failed: la_activity_events", row);

  console.log(JSON.stringify({
    ok: true,
    run_id: RUN_ID,
    inspect: {
      user_key: userKey,
      reporter_key: reporterKey,
      school_id: SCHOOL_ID,
      post_id: postId,
      comment_id: commentId,
    },
    db_counts: row,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
