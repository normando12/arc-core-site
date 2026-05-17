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
  if (msg.includes("ARC//_LEGACY_PAIR"))
    return "ARC//_LEGACY_PAIR · redeploy BobbieMultiSwap (npm run deploy:bobbieswap) for ETH, WBTC, or EUR pairs"
  if (msg.includes("ARC//_SWAP_ADDR"))
    return "ARC//_SWAP_ADDR · NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS does not point to BobbieArcSwap or BobbieMultiSwap"
  if (msg.includes("ARC//_SLIPPAGE"))
    return "ARC//_SLIPPAGE · received less than minimum; try again or use a smaller amount"
  if (msg.includes("ARC//_USDC_PUSH") || msg.includes("ARC//_PUSH"))
    return "ARC//_PUSH · swap pool lacks USDC/EUR; swap USDC→ARC first or fund the contract"
  if (msg.includes("ARC//_PAIR"))
    return "ARC//_PAIR · rate not configured for this pair on-chain"
  if (msg.includes("ARC//_DUST"))
    return "ARC//_DUST · amount too small after decimals and rate"
  if (msg.includes("User rejected") || msg.includes("user rejected"))
    return "ARC//_SIGNATURE_ABORT · operator rejected request"
  return `ARC//_TX_FAULT · ${msg.slice(0, 140)}`
}
