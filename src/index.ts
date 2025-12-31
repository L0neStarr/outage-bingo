interface Env{
  BINGO_BUCKET: R2Bucket;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Frontend calls: /api/outage-bingo/2025-12
    const match = url.pathname.match(/^\/api\/outage-bingo\/(\d{4})-(\d{2})$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const yyyy = match[1];
    const mm = match[2];

    // Build the R2 object key EXACTLY as it exists in the bucket
    const key = `outages-${yyyy}-${mm}.json`;

    // IMPORTANT: env binding name must match wrangler.jsonc binding
    // Your wrangler dev output shows env.BINGO_BUCKET, so use that.
    const obj = await env.BINGO_BUCKET.get(key);
    if (!obj) {
      return new Response(`Outage JSON not found: ${key}`, { status: 404 });
    }

    return new Response(await obj.text(), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};
