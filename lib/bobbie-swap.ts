import type { Address } from "viem"

import { bobbieSwapAddress as bobbieSwapAddressGenerated } from "@/src/constants/bobbieSwapAddress.generated"

/** Same constants as `BobbieArcSwap` constructor / Arc AI preview rate (USDC → ARC). */
export const BOBBIE_SWAP_RATE_NUM = 684n
export const BOBBIE_SWAP_RATE_DEN = 1000n

/** ARC out (18 decimals wei) from USDC amount (6 decimals base units). Matches `BobbieArcSwap.quoteArcOut`. */
export function quoteArcOutFromUsdc(usdcAmountBaseUnits: bigint): bigint {
  if (usdcAmountBaseUnits <= 0n) return 0n
  return (usdcAmountBaseUnits * BOBBIE_SWAP_RATE_NUM * 10n ** 12n) / BOBBIE_SWAP_RATE_DEN
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address

export function getBobbieSwapAddress(): Address | null {
  const raw = process.env.NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS?.trim()
  if (raw?.startsWith("0x") && raw.length === 42 && raw.toLowerCase() !== ZERO.toLowerCase()) {
    return raw as Address
  }
  if (
    bobbieSwapAddressGenerated &&
    bobbieSwapAddressGenerated.toLowerCase() !== ZERO.toLowerCase()
  ) {
    return bobbieSwapAddressGenerated as Address
  }
  return null
}

export function isBobbieSwapConfigured(): boolean {
  return getBobbieSwapAddress() !== null
}

/** Minimal ABI for BobbieArcSwap.swapUsdcForArc + quoteArcOut */
export const bobbieSwapAbi = [
  {
    type: "function",
    name: "swapUsdcForArc",
    stateMutability: "nonpayable",
    inputs: [
      { name: "usdcAmount", type: "uint256" },
      { name: "minArcOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "quoteArcOut",
    stateMutability: "view",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const
