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

/** Official Arc Testnet USDC ERC-20 interface (shared balance view with native gas). */
export const ARC_TESTNET_USDC: ArcPortfolioTokenMeta = USDC_META

/** Official Arc Testnet EURC (shown as EUR in swap UI). */
export const ARC_TESTNET_EURC: ArcPortfolioTokenMeta = EURC_META

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address

function optionalArcTokenMeta(): ArcPortfolioTokenMeta | null {
  const raw = process.env.NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS?.trim()
  if (
    raw?.startsWith("0x") &&
    raw.length === 42 &&
    raw.toLowerCase() !== ZERO_ADDR.toLowerCase()
  ) {
    const decStr = process.env.NEXT_PUBLIC_ARC_ERC20_DECIMALS?.trim()
    const decimals = decStr ? Number.parseInt(decStr, 10) : 18
    const d = Number.isFinite(decimals) && decimals >= 0 && decimals <= 36 ? decimals : 18
    return { symbol: "ARC", name: "ARC (ERC-20)", address: raw as Address, decimals: d }
  }
  if (
    bobbieArcTokenAddressGenerated &&
    bobbieArcTokenAddressGenerated.toLowerCase() !== ZERO_ADDR.toLowerCase()
  ) {
    return {
      symbol: "ARC",
      name: "ARC (ERC-20)",
      address: bobbieArcTokenAddressGenerated as Address,
      decimals: 18,
    }
  }
  return null
}

/** ARC demo ERC-20 linked to BobbieArcSwap (env or bundled codegen). Used for ARC→USDC + portfolio. */
export function getBobbieArcTokenAddress(): Address | null {
  const arc = optionalArcTokenMeta()
  return arc?.address ?? null
}

function optionalDemoTokenMeta(
  envKey: string,
  generated: string | undefined,
  symbol: string,
  name: string,
  decimals: number,
): ArcPortfolioTokenMeta | null {
  const raw = process.env[envKey]?.trim()
  const addr =
    raw?.startsWith("0x") && raw.length === 42 && raw.toLowerCase() !== ZERO_ADDR.toLowerCase()
      ? (raw as Address)
      : generated && generated.toLowerCase() !== ZERO_ADDR.toLowerCase()
        ? (generated as Address)
        : null
  if (!addr) return null
  return { symbol, name, address: addr, decimals }
}

/** Ordered list of Arc Testnet ERC-20 balances to show in portfolio UI. */
export function buildArcPortfolioTokenList(): ArcPortfolioTokenMeta[] {
  const arc = optionalArcTokenMeta()
  const eth = optionalDemoTokenMeta(
    "NEXT_PUBLIC_BOBBIE_ETH_TOKEN_ADDRESS",
    bobbieEthTokenAddressGenerated,
    "ETH",
    "ETH Demo",
    18,
  )
  const wbtc = optionalDemoTokenMeta(
    "NEXT_PUBLIC_BOBBIE_WBTC_TOKEN_ADDRESS",
    bobbieWbtcTokenAddressGenerated,
    "WBTC",
    "WBTC Demo",
    8,
  )
  const base: ArcPortfolioTokenMeta[] = [USDC_META, EURC_META, USYC_META]
  const demo = [arc, eth, wbtc].filter((x): x is ArcPortfolioTokenMeta => x != null)
  return [...base, ...demo]
}
