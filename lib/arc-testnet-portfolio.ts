import type { Address } from "viem"

import { bobbieArcTokenAddress as bobbieArcTokenAddressGenerated } from "@/src/constants/bobbieArcTokenAddress.generated"
import { bobbieEthTokenAddress as bobbieEthTokenAddressGenerated } from "@/src/constants/bobbieEthTokenAddress.generated"
import { bobbieWbtcTokenAddress as bobbieWbtcTokenAddressGenerated } from "@/src/constants/bobbieWbtcTokenAddress.generated"

/**
 * Arc Testnet token metadata for portfolio reads.
 * USDC / EURC / USYC: https://docs.arc.network/arc/references/contract-addresses
 */
export type ArcPortfolioTokenMeta = {
  symbol: string
  name: string
  /** null = swap demo token not deployed yet (UI shows 0, no RPC read) */
  address: Address | null
  decimals: number
}

const USDC_META: ArcPortfolioTokenMeta = {
  symbol: "USDC",
  name: "USD Coin",
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6,
}

const EUR_META: ArcPortfolioTokenMeta = {
  symbol: "EUR",
  name: "Euro Coin (EURC)",
  address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  decimals: 6,
}

const USYC_META: ArcPortfolioTokenMeta = {
  symbol: "USYC",
  name: "USYC",
  address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  decimals: 6,
}

/** Official Arc Testnet USDC ERC-20 interface (shared balance view with native gas). */
export const ARC_TESTNET_USDC: ArcPortfolioTokenMeta = USDC_META

/** EURC on Arc Testnet (swap + portfolio label EUR). */
export const ARC_TESTNET_EURC: ArcPortfolioTokenMeta = EUR_META

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address

function resolveTokenAddress(envKey: string, generated: string | undefined): Address | null {
  const raw = process.env[envKey]?.trim()
  if (raw?.startsWith("0x") && raw.length === 42 && raw.toLowerCase() !== ZERO_ADDR.toLowerCase()) {
    return raw as Address
  }
  if (generated && generated.toLowerCase() !== ZERO_ADDR.toLowerCase()) {
    return generated as Address
  }
  return null
}

function arcTokenMeta(): ArcPortfolioTokenMeta {
  const address = resolveTokenAddress("NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS", bobbieArcTokenAddressGenerated)
  const decStr = process.env.NEXT_PUBLIC_ARC_ERC20_DECIMALS?.trim()
  const decimals = decStr ? Number.parseInt(decStr, 10) : 18
  const d = Number.isFinite(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18
  return { symbol: "ARC", name: "ARC (ERC-20)", address, decimals: d }
}

function ethTokenMeta(): ArcPortfolioTokenMeta {
  return {
    symbol: "ETH",
    name: "ETH Demo",
    address: resolveTokenAddress("NEXT_PUBLIC_BOBBIE_ETH_TOKEN_ADDRESS", bobbieEthTokenAddressGenerated),
    decimals: 18,
  }
}

function wbtcTokenMeta(): ArcPortfolioTokenMeta {
  return {
    symbol: "WBTC",
    name: "WBTC Demo",
    address: resolveTokenAddress("NEXT_PUBLIC_BOBBIE_WBTC_TOKEN_ADDRESS", bobbieWbtcTokenAddressGenerated),
    decimals: 8,
  }
}

/** ARC demo ERC-20 linked to BobbieMultiSwap. */
export function getBobbieArcTokenAddress(): Address | null {
  return arcTokenMeta().address
}

/** Swap + sidebar token order (always shown; demo tokens without address read as 0). */
export function buildArcPortfolioTokenList(): ArcPortfolioTokenMeta[] {
  return [USDC_META, EUR_META, ethTokenMeta(), wbtcTokenMeta(), arcTokenMeta(), USYC_META]
}

export function isPortfolioTokenOnChain(meta: ArcPortfolioTokenMeta): boolean {
  return meta.address != null
}
