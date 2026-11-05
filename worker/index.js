// 1-Earth server code (runs on Cloudflare).
// /api/... requests are handled here; everything else is the website.
import { PublicKey } from "@solana/web3.js";
import { MintGate } from "./gate.js";
import { buildMintTransactions, mintedSoFar, ownedBy, usdcBalance } from "./solana.js";

export { MintGate };

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

function phaseMax(env, now = Date.now()) {
  const hours = (now - Date.parse(env.OPENS_AT)) / 36e5;
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
    minted: statusCache.minted,
    phaseMax: phaseMax(env),
  };
}

async function mint(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  if (blocked(env, request)) return json({ error: "1-Earth isn’t available in your region." }, 403);
  if (env.MINT_LIVE !== "true") return json({ error: "Minting isn’t live yet." }, 403);
  if (Date.now() < Date.parse(env.OPENS_AT)) return json({ error: "The mint hasn’t opened yet." }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
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

  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  const r = await gate.reserve({
    buyer, qty, owned, minted, phaseMax: max, supply: Number(env.SUPPLY), ttlMs: 180_000,
  });
  if (!r.ok) {
    if (r.reason === "wallet_limit") {
      return json({ error: r.walletLeft === 0
        ? `You’ve reached the limit of ${max} for now.`
        : `You can mint ${r.walletLeft} more right now.` }, 409);
    }
    return json({ error: r.supplyLeft === 0
      ? "Sold out (or the last entries are being minted). Try again in a few minutes."
      : `Only ${r.supplyLeft} left right now.` }, 409);
  }

  const built = await buildMintTransactions(env, buyer, qty);
  return json({ ...built, reservationId: r.id });
}

async function release(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const { reservationId, buyer, keep } = body || {};
  if (typeof reservationId !== "string" || typeof buyer !== "string") return json({ error: "Bad request." }, 400);
  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  return json(await gate.release({ id: reservationId, buyer, keep }));
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
      if (url.pathname === "/api/release") return await release(request, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
