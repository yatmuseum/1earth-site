// MintGate: a single Cloudflare Durable Object that every mint request goes
// through, one at a time. It "reserves" entries for a buyer before their
// transaction is signed, so two requests at the same moment can't both slip
// past the per-wallet limit or the 10,000 supply cap.
//
// A reservation lasts longer than a Solana transaction can stay valid, so a
// signed-but-unsent transaction can never land after its reservation expires.
import { DurableObject } from "cloudflare:workers";

export class MintGate extends DurableObject {
  async reserve({ buyer, qty, owned, minted, phaseMax, supply, ttlMs }) {
    const now = Date.now();
    let res = ((await this.ctx.storage.get("reservations")) || []).filter((r) => r.exp > now);

    const pendingBuyer = res.filter((r) => r.buyer === buyer).reduce((a, r) => a + r.qty, 0);
    const pendingAll = res.reduce((a, r) => a + r.qty, 0);
    const walletLeft = phaseMax - owned - pendingBuyer;
    const supplyLeft = supply - minted - pendingAll;

    if (qty > walletLeft) return { ok: false, reason: "wallet_limit", walletLeft: Math.max(0, walletLeft) };
    if (qty > supplyLeft) return { ok: false, reason: "supply", supplyLeft: Math.max(0, supplyLeft) };

    const id = crypto.randomUUID();
    res.push({ id, buyer, qty, exp: now + ttlMs });
    await this.ctx.storage.put("reservations", res);
    return { ok: true, id };
  }

  // Called when a purchase fails or is cancelled partway. Keeps the part that
  // was actually minted (until it shows up everywhere) and frees the rest.
  async release({ id, buyer, keep }) {
    const now = Date.now();
    let res = ((await this.ctx.storage.get("reservations")) || []).filter((r) => r.exp > now);
    const r = res.find((x) => x.id === id && x.buyer === buyer);
    if (!r) return { ok: false };
    const k = Math.max(0, Math.min(r.qty, Number(keep) || 0));
    res = k === 0 ? res.filter((x) => x !== r) : res.map((x) => (x === r ? { ...x, qty: k } : x));
    await this.ctx.storage.put("reservations", res);
    return { ok: true };
  }
}
