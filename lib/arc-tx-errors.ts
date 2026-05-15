/** Human-readable Arc / wallet errors for toasts (shared by Arc DApp + Bobbie AI). */
export function formatArcTxError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("ARC//_DAILY_GM_CAP"))
    return "ARC//_DAILY_GM_CAP · 10 SAY GM waves already sealed today (UTC day)"
  if (msg.includes("ARC//_FRAG_ORDER"))
    return "ARC//_FRAG_ORDER · resume the wave in sequence (check next pulse index on-chain)"
  if (msg.includes("ARC//_INVALID_GM_FRAGMENT"))
    return "ARC//_INVALID_GM_FRAGMENT · pulse index must be 0–9"
  if (msg.includes("ARC//_DOUBLE_VOTE_BLOCKED"))
    return "ARC//_DOUBLE_VOTE_BLOCKED · ballot already sealed"
  if (msg.includes("ARC//_INVALID_CHAMBER_ID"))
    return "ARC//_INVALID_CHAMBER_ID · chamber not indexed"
  if (msg.includes("User rejected") || msg.includes("user rejected"))
    return "ARC//_SIGNATURE_ABORT · operator rejected request"
  return `ARC//_TX_FAULT · ${msg.slice(0, 140)}`
}
