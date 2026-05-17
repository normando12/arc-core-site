import { quoteSwapOut, SWAP_DECIMALS } from "@/lib/bobbie-swap"
import { formatUnits, parseUnits } from "viem"

export const SWAP_SYMBOLS = ["USDC", "EUR", "ETH", "ARC", "WBTC"] as const
export type SwapSymbol = (typeof SWAP_SYMBOLS)[number]

export type SwapDraft = {
  fromSymbol: SwapSymbol
  toSymbol: SwapSymbol
  /** Normalized decimal string, e.g. "100" or "12.5" */
  fromAmount: string
}

function canonToken(raw: string): SwapSymbol | null {
  const x = raw.toLowerCase()
  if (x === "usdc") return "USDC"
  if (x === "eur" || x === "eurc") return "EUR"
  if (x === "eth" || x === "weth") return "ETH"
  if (x === "arc") return "ARC"
  if (x === "wbtc" || x === "btc") return "WBTC"
  return null
}

/**
 * Detects natural-language swap intent (PT/EN), e.g. "troque 100 usdc por arc", "swap 50 USDC to ETH".
 */
export function parseSwapIntent(raw: string): SwapDraft | null {
  const n = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const re =
    /(\d+(?:[.,]\d+)?)\s*(usdc|eurc?|eth|weth|arc|wbtc|btc)\s*(?:por|para|em|a|to|for|->|\/|→)\s*(usdc|eurc?|eth|weth|arc|wbtc|btc)\b/

  const m = n.match(re)
  if (!m) return null

  const fromSymbol = canonToken(m[2])
  const toSymbol = canonToken(m[3])
  if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) return null

  const fromAmount = m[1].replace(",", ".")
  const nAmt = Number.parseFloat(fromAmount)
  if (!Number.isFinite(nAmt) || nAmt <= 0) return null

  return { fromSymbol, toSymbol, fromAmount }
}

export function estimateSwapReceive(from: SwapSymbol, to: SwapSymbol, amount: number): string {
  if (from === to || amount <= 0) return "—"
  try {
    const pu = parseUnits(String(amount), SWAP_DECIMALS[from])
    const out = quoteSwapOut(from, to, pu)
    if (out === 0n) return "—"
    return `${formatUnits(out, SWAP_DECIMALS[to])} ${to}`
  } catch {
    return "—"
  }
}

/** @deprecated Use estimateSwapReceive */
export function estimateMockReceive(from: SwapSymbol, to: SwapSymbol, amount: number): string {
  return estimateSwapReceive(from, to, amount)
}
