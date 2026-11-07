// MintGate: a single Cloudflare Durable Object that every mint request goes
// through, one at a time. Before any transaction is signed, it reserves the
// entries for that buyer, so simultaneous requests can't slip past the
// per-wallet limit or the supply cap.
//
// A reservation is held until the transactions it was made for can no longer
// land on Solana (their "last valid block height" has passed, about 60-90
// seconds). Only the server decides this; nothing a browser sends can release
// a reservation early. While held, a purchase that already landed is counted
// both on-chain and here, which errs on the safe side for a minute or so.
import { DurableObject } from "cloudflare:workers";

const SAFETY_TTL_MS = 10 * 60_000; // backstop in case block heights ever look odd
// Keep each hold ~30 seconds (about 75 blocks) past the point its transactions
// could still land. This covers the wallet index catching up, and lets the
// server reuse a wallet's Gold Frame count for up to 20 seconds safely.
const GRACE_BLOCKS = 75;

export class MintGate extends DurableObject {
  async reserve({ buyer, qty, owned, minted, phaseMax, supply, blockHeight, validUntil }) {
    const now = Date.now();
    let res = ((await this.ctx.storage.get("reservations")) || [])
      .filter((r) => r.validUntil + GRACE_BLOCKS >= blockHeight && r.exp > now);

    const pendingBuyer = res.filter((r) => r.buyer === buyer).reduce((a, r) => a + r.qty, 0);
    const pendingAll = res.reduce((a, r) => a + r.qty, 0);
    const walletLeft = phaseMax - owned - pendingBuyer;
    const supplyLeft = supply - minted - pendingAll;

    if (qty > walletLeft) {
      await this.ctx.storage.put("reservations", res);
      return { ok: false, reason: "wallet_limit", walletLeft: Math.max(0, walletLeft), pendingBuyer };
    }
    if (qty > supplyLeft) {
      await this.ctx.storage.put("reservations", res);
      return { ok: false, reason: "supply", supplyLeft: Math.max(0, supplyLeft), pendingAll };
    }

    res.push({ buyer, qty, validUntil, exp: now + SAFETY_TTL_MS });
    await this.ctx.storage.put("reservations", res);
    return { ok: true };
  }

  // Each co-signing ticket works only once, so one approved purchase can never
  // be turned into extra mints.
  async useTicket({ id, ttlMs }) {
    const now = Date.now();
    const used = ((await this.ctx.storage.get("tickets")) || []).filter((t) => t.exp > now);
    if (used.some((t) => t.id === id)) return { ok: false };
    used.push({ id, exp: now + ttlMs });
    await this.ctx.storage.put("tickets", used);
    return { ok: true };
  }
}
