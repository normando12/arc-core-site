import type { Address } from "viem"

/**
 * Arc Testnet token metadata for portfolio reads.
 * USDC / EURC / USYC: https://docs.arc.network/arc/references/contract-addresses
 */
export type ArcPortfolioTokenMeta = {
  symbol: string
  name: string
  address: Address
  decimals: number
}

const USDC_META: ArcPortfolioTokenMeta = {
  symbol: "USDC",
  name: "USD Coin",
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6,
}

const EURC_META: ArcPortfolioTokenMeta = {
  symbol: "EURC",
  name: "Euro Coin",
  address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  decimals: 6,
}

const USYC_META: ArcPortfolioTokenMeta = {
  symbol: "USYC",
  name: "USYC",
  address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  decimals: 6,
}

function optionalArcFromEnv(): ArcPortfolioTokenMeta | null {
  const raw = process.env.NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS?.trim()
  if (!raw?.startsWith("0x") || raw.length !== 42) return null
  const decStr = process.env.NEXT_PUBLIC_ARC_ERC20_DECIMALS?.trim()
  const decimals = decStr ? Number.parseInt(decStr, 10) : 18
  const d = Number.isFinite(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18
  return { symbol: "ARC", name: "ARC (ERC-20)", address: raw as Address, decimals: d }
}

/** Ordered list of Arc Testnet ERC-20 balances to show in portfolio UI. */
export function buildArcPortfolioTokenList(): ArcPortfolioTokenMeta[] {
  const arc = optionalArcFromEnv()
  return arc ? [...[USDC_META, EURC_META, USYC_META], arc] : [USDC_META, EURC_META, USYC_META]
}
