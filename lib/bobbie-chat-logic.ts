import { parseSwapIntent, type SwapDraft } from "@/lib/arc-ai-parse-swap"

export function swapAck(parsed: SwapDraft, raw: string): string {
  const pt = /\b(troque|trocar|troca|por|para)\b/i.test(raw)
  if (pt) {
    return `Combinado — abri o swap ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. Para USDC→ARC na Arc Testnet, ao confirmar a carteira faz approve + BobbieArcSwap (desconta USDC ERC-20 e minta ARC demo). Precisa de NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS deployado (npm run deploy:bobbieswap). SAY GM continua à parte em ArcGovernance.emitGmBurst.`
  }
  return `Opening swap: ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. On Arc Testnet, USDC→ARC uses BobbieArcSwap (pull USDC, mint ARC demo token) once env swap addresses are configured — not emitGmBurst.`
}

export function replyFor(input: string): string {
  const t = input.toLowerCase()
  if (t.includes("swap"))
    return "Use Swap in the sidebar or describe USDC→ARC: amount cannot exceed your live USDC balance; confirming signs approve + BobbieArcSwap on Arc Testnet (deploy npm run deploy:bobbieswap + env vars). Proof of Presence (emitGmBurst) is only via Settings → demo tx."
  if (t.includes("bridge"))
    return "This app does not submit bridge transactions yet. Use an official bridge or faucet for Arc Testnet USDC; I can still reason about routes and gas when you describe the move."
  if (t.includes("portfolio") || t.includes("balance"))
    return "Open Portfolio in the sidebar for live ERC-20 balances on Arc Testnet (USDC, EURC, USYC). History still lives on ArcScan."
  if (t.includes("stake"))
    return "Validator delegation is not wired here yet. On Arc Testnet, use explorers and protocol UIs you trust; I can help compare commission and uptime in plain language."
  if (t.includes("trend") || t.includes("token"))
    return "Trending-style token copy here is illustrative, not live market data. Swap rates for USDC→ARC follow the BobbieArcSwap contract once deployed."
  return "I am Bobbie AI, your Arc Network copilot. USDC→ARC swap pulls USDC and mints ARC demo tokens via BobbieArcSwap when configured; balances update after the tx."
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
