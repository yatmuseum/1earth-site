// 1-Earth server code (runs on Cloudflare).
// /api/... requests are handled here; everything else is the website.
import { PublicKey } from "@solana/web3.js";
import { MintGate } from "./gate.js";
import { buildMintTransactions, latestBlockhash, mintedSoFar, ownedBy, usdcBalance, rpcUrl } from "./solana.js";

export { MintGate };

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

// If OPENS_AT is ever mistyped, treat the mint as not open (never as open).
function opensAtMs(env) {
  const t = Date.parse(env.OPENS_AT);
  return Number.isFinite(t) ? t : Infinity;
}

function phaseMax(env, now = Date.now()) {
  const hours = (now - opensAtMs(env)) / 36e5;
  if (hours < 24) return 1;
  if (hours < 48) return 10;
  return 100;
}

function blocked(env, request) {
  const list = (env.BLOCKED_COUNTRIES || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const country = request.cf?.country;
  return country && list.includes(country);
}

let statusCache = { at: 0, minted: null };

async function status(env) {
  if (Date.now() - statusCache.at > 15_000) {
    try { statusCache = { at: Date.now(), minted: await mintedSoFar(env) }; } catch { /* keep last */ }
  }
  return {
    network: env.NETWORK,
    live: env.MINT_LIVE === "true",
    opensAt: env.OPENS_AT,
    priceUsdc: Number(env.PRICE_USDC),
    supply: Number(env.SUPPLY),
    // Before the mint opens nothing has been minted yet, so show 0 (this also
    // hides any devnet test mints from public view).
    minted: Date.now() < opensAtMs(env) ? 0 : statusCache.minted,
    phaseMax: phaseMax(env),
  };
}

async function mint(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  if (blocked(env, request)) return json({ error: "1-Earth isn’t available in your region." }, 403);
  if (env.MINT_LIVE !== "true") return json({ error: "Minting isn’t live yet." }, 403);
  if (Date.now() < opensAtMs(env)) return json({ error: "The mint hasn’t opened yet." }, 403);

  let body;
  try {
    const text = await request.text();
    if (text.length > 2_000) return json({ error: "Bad request." }, 400);
    body = JSON.parse(text);
  } catch { return json({ error: "Bad request." }, 400); }
  const { buyer, quantity, acceptedTerms } = body || {};

  if (acceptedTerms !== true) return json({ error: "Please confirm the eligibility checkbox." }, 400);
  try { new PublicKey(buyer); } catch { return json({ error: "Invalid wallet address." }, 400); }
  const qty = Number(quantity);
  const max = phaseMax(env);
  if (!Number.isInteger(qty) || qty < 1 || qty > max) {
    return json({ error: max === 1 ? "You can mint 1 right now." : `You can mint 1 to ${max} right now.` }, 400);
  }

  const price = Number(env.PRICE_USDC);
  const [owned, minted, balance] = await Promise.all([
    ownedBy(env, buyer), mintedSoFar(env), usdcBalance(env, buyer),
  ]);
  if (balance < qty * price) {
    return json({ error: `Not enough USDC. You need ${qty * price} USDC plus a little SOL for fees.` }, 400);
  }

  // The reservation lives exactly as long as these transactions could land.
  const bh = await latestBlockhash(env);
  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  const r = await gate.reserve({
    buyer, qty, owned, minted, phaseMax: max, supply: Number(env.SUPPLY),
    blockHeight: bh.lastValidBlockHeight - 150, validUntil: bh.lastValidBlockHeight,
  });
  if (!r.ok) {
    if (r.reason === "wallet_limit") {
      if (r.pendingBuyer > 0 && r.walletLeft < qty) {
        return json({ error: r.walletLeft === 0
          ? "Your last purchase is still settling. Try again in about a minute."
          : `You can mint ${r.walletLeft} more right now (your last purchase is still settling).` }, 409);
      }
      return json({ error: r.walletLeft === 0
        ? `You’ve reached the limit of ${max} for now.`
        : `You can mint ${r.walletLeft} more right now.` }, 409);
    }
    if (r.supplyLeft === 0 && r.pendingAll > 0) {
      return json({ error: "The last entries are being minted. Try again in about a minute." }, 409);
    }
    return json({ error: r.supplyLeft === 0 ? "Sold out." : `Only ${r.supplyLeft} left right now.` }, 409);
  }

  const built = await buildMintTransactions(env, buyer, qty, bh);
  return json(built);
}

// The website's blockchain requests go through here to Helius, so the Helius
// key stays secret. Only the few methods the site needs are allowed, and only
// from 1-earth.io pages.
const RPC_ALLOWED = new Set([
  "sendTransaction", "getSignatureStatuses", "getBlockHeight", "getLatestBlockhash",
]);

async function rpcRelay(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  const origin = request.headers.get("origin");
  let sameSite = false;
  try { sameSite = new URL(origin).host === new URL(request.url).host; } catch { /* missing or bad */ }
  if (!sameSite) return json({ error: "Forbidden" }, 403);
  const text = await request.text();
  if (text.length > 20_000) return json({ error: "Too large" }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "Bad request" }, 400); }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 10 || calls.some((c) => !RPC_ALLOWED.has(c?.method))) {
    return json({ jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32601, message: "Method not allowed" } }, 403);
  }
  const upstream = await fetch(rpcUrl(env), {
    method: "POST", headers: { "content-type": "application/json" }, body: text,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          heliusKeyConfigured: Boolean(env.HELIUS_API_KEY),
          minterKeyConfigured: Boolean(env.MINTER_SECRET_KEY),
          country: request.cf?.country ?? null,
        });
      }
      if (url.pathname === "/api/status") return json(await status(env));
      if (url.pathname === "/api/mint") return await mint(request, env);
      if (url.pathname === "/api/rpc") return await rpcRelay(request, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
