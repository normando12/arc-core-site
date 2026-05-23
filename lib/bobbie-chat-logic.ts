import { parseSwapIntent, type SwapDraft } from "@/lib/arc-ai-parse-swap"
import { parseWalletCommand, walletCommandLoadingLabel, type WalletCommandKind } from "@/lib/command-parser"
import { handleWalletCommand, type WalletChatContext } from "@/lib/wallet-chat-handler"

export function swapAck(parsed: SwapDraft, raw: string): string {
  const pt = /\b(troque|trocar|troca|por|para)\b/i.test(raw)
  if (pt) {
    return `Combinado — abri o swap ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. Na Arc Testnet, BobbieMultiSwap executa o par com taxa fixa (USDC/EUR podem pedir approve; ARC/ETH/WBTC demo queimam no contrato). Deploy: npm run deploy:bobbieswap. SAY GM é separado em ArcGovernance.emitGmBurst.`
  }
  return `Opening swap: ${parsed.fromAmount} ${parsed.fromSymbol} → ${parsed.toSymbol}. On Arc Testnet, BobbieMultiSwap supports USDC, EUR (EURC), ETH, ARC, and WBTC at fixed preview rates. Configure via deploy or env — not emitGmBurst.`
}

export function replyFor(input: string): string {
  const t = input.toLowerCase()
  if (t.includes("swap"))
    return "Use Swap in the sidebar or describe a pair (e.g. 100 USDC to ETH). Supported: USDC, EUR, ETH, ARC, WBTC. USDC/EUR may need approve; demo tokens burn in one tx. Proof of Presence (emitGmBurst) is only via Settings → demo tx."
  if (t.includes("bridge"))
    return "This app does not submit bridge transactions yet. Use an official bridge or faucet for Arc Testnet USDC; I can still reason about routes and gas when you describe the move."
  if (t.includes("portfolio"))
    return "Open Portfolio in the sidebar for live ERC-20 balances on Arc Testnet (USDC, EURC, USYC, plus demo ARC/ETH/WBTC after deploy). History still lives on ArcScan."
  if (t.includes("stake"))
    return "Validator delegation is not wired here yet. On Arc Testnet, use explorers and protocol UIs you trust; I can help compare commission and uptime in plain language."
  if (t.includes("trend") || t.includes("token"))
    return "Trending-style token copy here is illustrative, not live market data. Swap rates follow BobbieMultiSwap once deployed."
  return "I am Bobbie AI, your Arc Network copilot. Multi-asset swaps use BobbieMultiSwap on Arc Testnet when configured; balances update after the tx."
}

export type AssistantReply = {
  text: string
  swapDraft: SwapDraft | null
  walletCommand?: WalletCommandKind | null
  loadingHint?: string | null
}

export function buildAssistantReply(input: string): AssistantReply {
  const trimmed = input.trim()
  if (!trimmed) {
    return { text: "Send a message to continue.", swapDraft: null }
  }

  const walletCmd = parseWalletCommand(trimmed)
  if (walletCmd) {
    return {
      text: "",
      swapDraft: null,
      walletCommand: walletCmd.kind,
      loadingHint: walletCommandLoadingLabel(walletCmd.kind),
    }
  }

  const parsed = parseSwapIntent(trimmed)
  if (parsed) {
    return { text: swapAck(parsed, trimmed), swapDraft: parsed }
  }
  return { text: replyFor(trimmed), swapDraft: null }
}

export async function buildAssistantReplyAsync(
  input: string,
  walletCtx: WalletChatContext,
): Promise<AssistantReply> {
  const trimmed = input.trim()
  if (!trimmed) {
    return { text: "Send a message to continue.", swapDraft: null }
  }

  const walletResult = await handleWalletCommand(trimmed, walletCtx)
  if (walletResult) {
    return {
      text: walletResult.text,
      swapDraft: null,
      walletCommand: walletResult.walletCommand,
    }
  }

  const parsed = parseSwapIntent(trimmed)
  if (parsed) {
    return { text: swapAck(parsed, trimmed), swapDraft: parsed }
  }
  return { text: replyFor(trimmed), swapDraft: null }
}
