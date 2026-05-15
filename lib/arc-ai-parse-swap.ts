export const SWAP_SYMBOLS = ["USDC", "ETH", "ARC", "WBTC"] as const
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
  if (x === "eth" || x === "weth") return "ETH"
  if (x === "arc") return "ARC"
  if (x === "wbtc" || x === "btc") return "WBTC"
  return null
}

/**
 * Detects natural-language swap intent (PT/EN), e.g. "troque 100 usdc por arc", "swap 50 USDC to ARC".
 * Expects: amount + fromToken + separator + toToken.
 */
export function parseSwapIntent(raw: string): SwapDraft | null {
  const n = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const re =
    /(\d+(?:[.,]\d+)?)\s*(usdc|eth|weth|arc|wbtc|btc)\s*(?:por|para|em|a|to|for|->|\/|→)\s*(usdc|eth|weth|arc|wbtc|btc)\b/

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

/** Mock spot rates for preview labels only. */
const MOCK_RATE: Record<SwapSymbol, Partial<Record<SwapSymbol, number>>> = {
  USDC: { ARC: 0.684, ETH: 0.0002172, WBTC: 0.0000112 },
  ARC: { USDC: 1.4626, ETH: 0.0003175, WBTC: 0.0000164 },
  ETH: { ARC: 3158, USDC: 4624, WBTC: 0.0516 },
  WBTC: { ARC: 98140, USDC: 143650, ETH: 19.62 },
}

export function estimateMockReceive(from: SwapSymbol, to: SwapSymbol, amount: number): string {
  const rate = MOCK_RATE[from]?.[to]
  if (rate == null) return "—"
  const out = amount * rate
  const digits = out >= 1 ? 2 : out >= 0.0001 ? 6 : 8
  return `${out.toFixed(digits)} ${to}`
}
