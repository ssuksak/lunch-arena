import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Review interactions are limited to likes and dislikes.
// Keep a tombstone endpoint so older clients cannot create review comments.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  return Response.json({ error: "REVIEW_COMMENTS_DISABLED" }, { status: 410, headers });
});
