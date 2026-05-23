import type { Address } from "viem"

import {
  buildSwapPortfolioTokenList,
  type ArcPortfolioTokenMeta,
} from "@/lib/arc-testnet-portfolio"

/** Supported tokens for chat balance / analytics commands. */
export const CHAT_SUPPORTED_SYMBOLS = ["USDC", "ARC", "ETH", "EURC", "WBTC"] as const
export type ChatSupportedSymbol = (typeof CHAT_SUPPORTED_SYMBOLS)[number]

export type ChatSupportedTokenMeta = ArcPortfolioTokenMeta & {
  symbol: ChatSupportedSymbol | string
}

const SYMBOL_ALIASES: Record<string, ChatSupportedSymbol> = {
  USDC: "USDC",
  ARC: "ARC",
  ETH: "ETH",
  WETH: "ETH",
  EUR: "EURC",
  EURC: "EURC",
  WBTC: "WBTC",
  BTC: "WBTC",
}

/** Token list for chat commands — USDC, ARC, ETH, EURC, WBTC. */
export function buildChatSupportedTokenList(): ArcPortfolioTokenMeta[] {
  const all = buildSwapPortfolioTokenList()
  const bySymbol = new Map(all.map((t) => [t.symbol, t]))

  const usdc = bySymbol.get("USDC")
  const arc = bySymbol.get("ARC")
  const eth = bySymbol.get("ETH")
  const eur = bySymbol.get("EUR")
  const wbtc = bySymbol.get("WBTC")

  const list: ArcPortfolioTokenMeta[] = []
  if (usdc) list.push({ ...usdc, symbol: "USDC" })
  if (arc) list.push({ ...arc, symbol: "ARC" })
  if (eth) list.push({ ...eth, symbol: "ETH" })
  if (eur) list.push({ ...eur, symbol: "EURC", name: "Euro Coin (EURC)" })
  if (wbtc) list.push({ ...wbtc, symbol: "WBTC" })
  return list
}

export function resolveTokenSymbolByAddress(address: string): ChatSupportedSymbol | null {
  const addr = address.toLowerCase()
  for (const meta of buildChatSupportedTokenList()) {
    if (meta.address?.toLowerCase() === addr) {
      const sym = meta.symbol.toUpperCase()
      return SYMBOL_ALIASES[sym] ?? (sym as ChatSupportedSymbol)
    }
  }
  return null
}

export function normalizeTokenSymbol(raw: string): ChatSupportedSymbol | null {
  return SYMBOL_ALIASES[raw.toUpperCase()] ?? null
}

export function isChatSupportedAddress(address: Address | null | undefined): boolean {
  if (!address) return false
  return resolveTokenSymbolByAddress(address) != null
}
