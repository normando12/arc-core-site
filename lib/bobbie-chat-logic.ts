import { parseSwapIntent, type SwapDraft } from "@/lib/arc-ai-parse-swap"

export function swapAck(parsed: SwapDraft, raw: string): string {
  const pt = /\b(troque|trocar|troca|por|para)\b/i.test(raw)
  if (pt) {
    return `Combinado — abri o swap ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. Na Arc Testnet, USDC→ARC usa approve de USDC + BobbieArcSwap.swapUsdcForArc; ARC→USDC usa swapArcForUsdc (queima o teu ARC demo e devolve USDC). Contrato: npm run deploy:bobbieswap ou variáveis de ambiente. SAY GM é separado em ArcGovernance.emitGmBurst.`
  }
  return `Opening swap: ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. On Arc Testnet, USDC↔ARC uses BobbieArcSwap — forward pulls USDC and mints ARC; reverse burns ARC and returns USDC. Configure addresses via deploy or env — not emitGmBurst.`
}

export function replyFor(input: string): string {
  const t = input.toLowerCase()
  if (t.includes("swap"))
    return "Use Swap in the sidebar or describe USDC↔ARC: amount cannot exceed your live balance; USDC→ARC signs USDC approve + swapUsdcForArc; ARC→USDC signs swapArcForUsdc (Arc Testnet). Proof of Presence (emitGmBurst) is only via Settings → demo tx."
  if (t.includes("bridge"))
    return "This app does not submit bridge transactions yet. Use an official bridge or faucet for Arc Testnet USDC; I can still reason about routes and gas when you describe the move."
  if (t.includes("portfolio") || t.includes("balance"))
    return "Open Portfolio in the sidebar for live ERC-20 balances on Arc Testnet (USDC, EURC, USYC). History still lives on ArcScan."
  if (t.includes("stake"))
    return "Validator delegation is not wired here yet. On Arc Testnet, use explorers and protocol UIs you trust; I can help compare commission and uptime in plain language."
  if (t.includes("trend") || t.includes("token"))
    return "Trending-style token copy here is illustrative, not live market data. USDC↔ARC rates follow BobbieArcSwap once deployed."
  return "I am Bobbie AI, your Arc Network copilot. USDC↔ARC uses BobbieArcSwap on Arc Testnet when configured; balances update after the tx."
}

export function buildAssistantReply(input: string): { text: string; swapDraft: SwapDraft | null } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { text: "Send a message to continue.", swapDraft: null }
  }
  const parsed = parseSwapIntent(trimmed)
  if (parsed) {
    return { text: swapAck(parsed, trimmed), swapDraft: parsed }
  }
  return { text: replyFor(trimmed), swapDraft: null }
}
