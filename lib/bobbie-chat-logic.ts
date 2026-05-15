import { parseSwapIntent, type SwapDraft } from "@/lib/arc-ai-parse-swap"

export function swapAck(parsed: SwapDraft, raw: string): string {
  const pt = /\b(troque|trocar|troca|por|para)\b/i.test(raw)
  if (pt) {
    return `Combinado — abri o swap com ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. O modal é pré-visualização; ao confirmar, a carteira assina emitGmBurst na ArcGovernance (Arc Testnet, gas em USDC).`
  }
  return `Opening swap: ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. Review the pair in the modal (preview). Confirming runs a real emitGmBurst on ArcGovernance (not a DEX swap).`
}

export function replyFor(input: string): string {
  const t = input.toLowerCase()
  if (t.includes("swap"))
    return "Use Swap in the sidebar or describe a pair: the modal previews routing; confirming asks your wallet to sign a real emitGmBurst on ArcGovernance (not a DEX trade). Gas is USDC on Arc Testnet."
  if (t.includes("bridge"))
    return "This app does not submit bridge transactions yet. Use an official bridge or faucet for Arc Testnet USDC; I can still reason about routes and gas when you describe the move."
  if (t.includes("portfolio") || t.includes("balance"))
    return "Open Portfolio in the sidebar for live ERC-20 balances on Arc Testnet (USDC, EURC, USYC). History still lives on ArcScan."
  if (t.includes("stake"))
    return "Validator delegation is not wired here yet. On Arc Testnet, use explorers and protocol UIs you trust; I can help compare commission and uptime in plain language."
  if (t.includes("trend") || t.includes("token"))
    return "Trending-style token copy here is illustrative, not live market data. Ask for Arc Testnet mechanics, gas (USDC), or how to confirm a real emitGmBurst from the swap flow."
  return "I am Bobbie AI, your Arc Network copilot. Swap previews are off-chain; confirming in the modal signs a real ArcGovernance.emitGmBurst on Arc Testnet (Proof of Presence, USDC gas)."
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
