// 1-Earth server code (runs on Cloudflare).
// /api/... requests are handled here; everything else is the website.
import { PublicKey } from "@solana/web3.js";
import { MintGate } from "./gate.js";
import { BusyError, buildMintTransactions, expectedFor, latestBlockhash, mintedSoFar, minterSecret, ownedBy, usdcBalance, rpcUrl } from "./solana.js";
import { makeTicket, readTicket, validateAndCosign } from "./cosign.js";

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
  if (hours < 24) return 5;  // first 24 hours: max 5 per wallet
  return 50;                 // after that: max 50 per wallet
}

function blocked(env, request) {
  const list = (env.BLOCKED_COUNTRIES || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const country = request.cf?.country;
  return country && list.includes(country);
}

let statusCache = { at: 0, minted: null };

async function status(env) {
  if (Date.now() - statusCache.at > 15_000) {
    try { statusCache = { at: Date.now(), minted: await mintedSoFar(env, 10_000) }; } catch { /* keep last */ }
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
  const { buyer, quantity, acceptedTerms, wallet } = body || {};

  if (acceptedTerms !== true) return json({ error: "Please confirm the eligibility checkbox." }, 400);
  try { new PublicKey(buyer); } catch { return json({ error: "Invalid wallet address." }, 400); }

  // During a rehearsal, only the listed test wallets can mint.
  const allow = (env.ALLOWLIST || "").split(",").map((a) => a.trim()).filter(Boolean);
  if (allow.length && !allow.includes(buyer)) return json({ error: "Minting isn’t open yet." }, 403);
  const qty = Number(quantity);
  const max = phaseMax(env);
  if (!Number.isInteger(qty) || qty < 1 || qty > max) {
    return json({ error: max === 1 ? "You can mint 1 right now." : `You can mint 1 to ${max} right now.` }, 400);
  }

  const price = Number(env.PRICE_USDC);
  const [owned, minted, balance] = await Promise.all([
    ownedBy(env, buyer), mintedSoFar(env, 2_000), usdcBalance(env, buyer),
  ]);
  if (balance < qty * price) {
    return json({ error: `Not enough USDC. You need ${qty * price} USDC plus a little SOL for fees.` }, 400);
  }

  // The reservation lives exactly as long as these transactions could land.
  const bh = await latestBlockhash(env);
  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  const purchase = crypto.randomUUID();
  const r = await gate.reserve({
    id: purchase, buyer, qty, owned, minted, phaseMax: max, supply: Number(env.SUPPLY),
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

  let built;
  // Phantom's safety scanner currently accepts up to 3 Gold Frames per
  // transaction, so Phantom purchases are split 3 + 2 (still one approval in
  // Phantom). Other wallets get up to 5 per transaction. This only changes how
  // a purchase is split, never what's paid or minted.
  const perTxMax = /phantom/i.test(String(wallet || "")) ? 3 : 5;
  try { built = await buildMintTransactions(env, buyer, qty, bh, perTxMax); }
  catch (e) {
    if (e.message === "SIMULATION_FAILED") {
      return json({ error: "Couldn’t prepare your mint. Check you have enough USDC and a little SOL, then try again." }, 400);
    }
    throw e;
  }
  const tickets = await Promise.all(built.perTx.map((n, i) => makeTicket(minterSecret(env), {
    id: `${purchase}:${i}`, p: purchase, b: buyer, n, bh: built.blockhash,
  })));
  return json({ ...built, tickets });
}

// For purchases with several transactions: just before the buyer approves the
// next one, rebuild it with a fresh blockhash (they expire after about a
// minute) and extend the purchase's reservation to match.
async function nextTx(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  let body;
  try {
    const text = await request.text();
    if (text.length > 2_000) return json({ error: "Bad request." }, 400);
    body = JSON.parse(text);
  } catch { return json({ error: "Bad request." }, 400); }
  const t = await readTicket(minterSecret(env), body?.ticket);
  if (!t || !t.p) return json({ error: "Invalid ticket." }, 400);

  let bh;
  try { bh = await latestBlockhash(env); }
  catch (e) { if (e instanceof BusyError) return json({ error: "busy" }, 503); throw e; }
  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  const ext = await gate.extend({
    purchase: t.p, ticketId: t.id,
    blockHeight: bh.lastValidBlockHeight - 150, validUntil: bh.lastValidBlockHeight,
  });
  if (!ext.ok) {
    return json({ error: ext.reason === "used"
      ? "This transaction was already processed."
      : "This purchase timed out. Anything already confirmed is in your wallet; please buy the rest again." }, 409);
  }
  let built;
  try { built = await buildMintTransactions(env, t.b, t.n, bh, t.n); }
  catch (e) {
    if (e.message === "SIMULATION_FAILED") {
      return json({ error: "Couldn’t prepare the next transaction. Check you have enough USDC and a little SOL." }, 400);
    }
    throw e;
  }
  if (built.transactions.length !== 1) return json({ error: "Couldn’t prepare the next transaction." }, 500);
  const ticket = await makeTicket(minterSecret(env), { id: t.id, p: t.p, b: t.b, n: t.n, bh: built.blockhash });
  return json({ tx: built.transactions[0], ticket, lastValidBlockHeight: built.lastValidBlockHeight });
}

// Step 2 of a purchase: the wallet has signed; check it and add the minter's signature.
async function cosign(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  let body;
  try {
    const text = await request.text();
    if (text.length > 8_000) return json({ error: "Bad request." }, 400);
    body = JSON.parse(text);
  } catch { return json({ error: "Bad request." }, 400); }
  const t = await readTicket(minterSecret(env), body?.ticket);
  if (!t) return json({ error: "Invalid ticket." }, 400);

  const expected = await expectedFor(env, t.b, t.n, t.bh);
  const result = validateAndCosign(String(body.tx || ""), expected);
  if (result.error) {
    console.error("Cosign refused:", result.error, t.b);
    return json({ error: `Transaction check failed: ${result.error}` }, 400);
  }
  // Only after the transaction passes every check is the ticket used up.
  const gate = env.MINT_GATE.get(env.MINT_GATE.idFromName("global"));
  const use = await gate.useTicket({ id: t.id, ttlMs: 10 * 60_000 });
  if (!use.ok) return json({ error: "This transaction was already processed." }, 409);
  return json({ tx: result.tx });
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
          network: env.NETWORK,
          minterKeyConfigured: Boolean(minterSecret(env)),
          country: request.cf?.country ?? null,
        });
      }
      if (url.pathname === "/api/status") return json(await status(env));
      if (url.pathname === "/api/mint") return await mint(request, env);
      if (url.pathname === "/api/rpc") return await rpcRelay(request, env);
      if (url.pathname === "/api/cosign") return await cosign(request, env);
      if (url.pathname === "/api/next") return await nextTx(request, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    } catch (e) {
      if (e instanceof BusyError) {
        return json({ error: "The mint is very busy right now. Please try again in a few seconds.", busy: true }, 503);
      }
      console.error(e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
