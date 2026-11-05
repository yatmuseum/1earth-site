// 1-Earth server code (runs on Cloudflare).
// Requests to /api/... are handled here; everything else is the website.
// The mint endpoints will be added to this file.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        heliusKeyConfigured: Boolean(env.HELIUS_API_KEY),
        country: request.cf?.country ?? null,
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
