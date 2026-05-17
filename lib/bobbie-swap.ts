import type { Address, PublicClient } from "viem"

import type { SwapSymbol } from "@/lib/arc-ai-parse-swap"

import { bobbieArcTokenAddress as bobbieArcTokenAddressGenerated } from "@/src/constants/bobbieArcTokenAddress.generated"
import { bobbieEthTokenAddress as bobbieEthTokenAddressGenerated } from "@/src/constants/bobbieEthTokenAddress.generated"
import { bobbieSwapAddress as bobbieSwapAddressGenerated } from "@/src/constants/bobbieSwapAddress.generated"
import { bobbieWbtcTokenAddress as bobbieWbtcTokenAddressGenerated } from "@/src/constants/bobbieWbtcTokenAddress.generated"
import type { ArcPortfolioTokenMeta } from "@/lib/arc-testnet-portfolio"
import { ARC_TESTNET_EURC, ARC_TESTNET_USDC } from "@/lib/arc-testnet-portfolio"

/** Same constants as legacy `BobbieArcSwap` (USDC → ARC). */
export const BOBBIE_SWAP_RATE_NUM = 684n
export const BOBBIE_SWAP_RATE_DEN = 1000n

/** On-chain token ids in `BobbieMultiSwap`. */
export const SWAP_TOKEN_ID: Record<SwapSymbol, number> = {
  USDC: 0,
  EUR: 1,
  ARC: 2,
  ETH: 3,
  WBTC: 4,
}

/** Fixed rates (out per 1 in) — must match `BobbieMultiSwap._initRates`. */
const SWAP_RATE: Record<SwapSymbol, Partial<Record<SwapSymbol, { num: bigint; den: bigint }>>> = {
  USDC: {
    ARC: { num: 684n, den: 1000n },
    EUR: { num: 926n, den: 1000n },
    ETH: { num: 2172n, den: 10_000_000n },
    WBTC: { num: 112n, den: 10_000_000n },
  },
  EUR: {
    USDC: { num: 108n, den: 100n },
    ARC: { num: 74n, den: 100n },
    ETH: { num: 234n, den: 1_000_000n },
    WBTC: { num: 121n, den: 10_000_000n },
  },
  ARC: {
    USDC: { num: 14626n, den: 10_000n },
    EUR: { num: 1351n, den: 1000n },
    ETH: { num: 3175n, den: 10_000_000n },
    WBTC: { num: 164n, den: 10_000_000n },
  },
  ETH: {
    ARC: { num: 3158n, den: 1n },
    USDC: { num: 4624n, den: 1n },
    EUR: { num: 4274n, den: 1n },
    WBTC: { num: 516n, den: 10_000n },
  },
  WBTC: {
    ARC: { num: 98140n, den: 1n },
    USDC: { num: 143650n, den: 1n },
    EUR: { num: 132870n, den: 1n },
    ETH: { num: 1962n, den: 100n },
  },
}

export const SWAP_DECIMALS: Record<SwapSymbol, number> = {
  USDC: 6,
  EUR: 6,
  ARC: 18,
  ETH: 18,
  WBTC: 8,
}

export function isExecutableSwapPair(from: SwapSymbol, to: SwapSymbol): boolean {
  if (from === to) return false
  return SWAP_RATE[from]?.[to] != null
}

export function quoteSwapOut(from: SwapSymbol, to: SwapSymbol, amountIn: bigint): bigint {
  if (amountIn <= 0n || from === to) return 0n
  const r = SWAP_RATE[from]?.[to]
  if (!r) return 0n
  const inDec = SWAP_DECIMALS[from]
  const outDec = SWAP_DECIMALS[to]
  if (outDec >= inDec) {
    const scale = 10n ** BigInt(outDec - inDec)
    return (amountIn * r.num * scale) / r.den
  }
  const scale = 10n ** BigInt(inDec - outDec)
  return (amountIn * r.num) / (r.den * scale)
}

/** ARC out (18 decimals wei) from USDC amount (6 decimals base units). */
export function quoteArcOutFromUsdc(usdcAmountBaseUnits: bigint): bigint {
  return quoteSwapOut("USDC", "ARC", usdcAmountBaseUnits)
}

/** USDC out (6 decimals) from ARC amount (18 decimals wei). */
export function quoteUsdcOutFromArc(arcAmountBaseUnits: bigint): bigint {
  return quoteSwapOut("ARC", "USDC", arcAmountBaseUnits)
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address

function resolveAddress(envKey: string, generated: string | undefined): Address | null {
  const raw = process.env[envKey]?.trim()
  if (raw?.startsWith("0x") && raw.length === 42 && raw.toLowerCase() !== ZERO.toLowerCase()) {
    return raw as Address
  }
  if (generated && generated.toLowerCase() !== ZERO.toLowerCase()) {
    return generated as Address
  }
  return null
}

export function getBobbieSwapAddress(): Address | null {
  return resolveAddress("NEXT_PUBLIC_BOBBIE_SWAP_ADDRESS", bobbieSwapAddressGenerated)
}

export function isBobbieSwapConfigured(): boolean {
  return getBobbieSwapAddress() !== null
}

export function getBobbieArcTokenAddress(): Address | null {
  return resolveAddress("NEXT_PUBLIC_ARC_ERC20_TOKEN_ADDRESS", bobbieArcTokenAddressGenerated)
}

export function getBobbieEthTokenAddress(): Address | null {
  return resolveAddress("NEXT_PUBLIC_BOBBIE_ETH_TOKEN_ADDRESS", bobbieEthTokenAddressGenerated)
}

export function getBobbieWbtcTokenAddress(): Address | null {
  return resolveAddress("NEXT_PUBLIC_BOBBIE_WBTC_TOKEN_ADDRESS", bobbieWbtcTokenAddressGenerated)
}

/** ERC-20 pulled/pushed by the swap contract for each symbol. */
export function getSwapTokenAddress(symbol: SwapSymbol): Address | null {
  switch (symbol) {
    case "USDC":
      return ARC_TESTNET_USDC.address!
    case "EUR":
      return ARC_TESTNET_EURC.address!
    case "ARC":
      return getBobbieArcTokenAddress()
    case "ETH":
      return getBobbieEthTokenAddress()
    case "WBTC":
      return getBobbieWbtcTokenAddress()
    default:
      return null
  }
}

/** Mintable demo tokens need their address configured for inbound swaps. */
export function isSwapMintableConfigured(symbol: SwapSymbol): boolean {
  if (symbol === "USDC" || symbol === "EUR") return true
  return getSwapTokenAddress(symbol) !== null
}

export function isSwapPairReady(from: SwapSymbol, to: SwapSymbol): boolean {
  if (!isExecutableSwapPair(from, to)) return false
  return isBobbieSwapConfigured()
}

/** Minimal ABI for BobbieMultiSwap (+ legacy USDC↔ARC). */
export const bobbieSwapAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromId", type: "uint8" },
      { name: "toId", type: "uint8" },
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "quoteOut",
    stateMutability: "view",
    inputs: [
      { name: "fromId", type: "uint8" },
      { name: "toId", type: "uint8" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
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
    name: "swapArcForUsdc",
    stateMutability: "nonpayable",
    inputs: [
      { name: "arcAmount", type: "uint256" },
      { name: "minUsdcOut", type: "uint256" },
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
  {
    type: "function",
    name: "quoteUsdcOut",
    stateMutability: "view",
    inputs: [{ name: "arcAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "arcToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "ethToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "wbtcToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const

export type BobbieSwapVariant = "multi" | "legacy" | "unknown"

/** `BobbieArcSwap` (USDC↔ARC only) vs `BobbieMultiSwap` (all pairs). */
export async function detectBobbieSwapVariant(
  client: PublicClient,
  swapAddr: Address,
): Promise<BobbieSwapVariant> {
  try {
    await client.readContract({
      address: swapAddr,
      abi: bobbieSwapAbi,
      functionName: "eurc",
    })
    return "multi"
  } catch {
    /* not MultiSwap */
  }
  try {
    await client.readContract({
      address: swapAddr,
      abi: bobbieSwapAbi,
      functionName: "quoteUsdcOut",
      args: [1n],
    })
    return "legacy"
  } catch {
    return "unknown"
  }
}

export type BobbieSwapWriteCall =
  | {
      variant: "multi"
      functionName: "swap"
      args: readonly [number, number, bigint, bigint]
      expectedOut: bigint
    }
  | {
      variant: "legacy"
      functionName: "swapUsdcForArc"
      args: readonly [bigint, bigint]
      expectedOut: bigint
    }
  | {
      variant: "legacy"
      functionName: "swapArcForUsdc"
      args: readonly [bigint, bigint]
      expectedOut: bigint
    }

function applySlippage(expectedOut: bigint, slippageBps = 100): bigint {
  if (expectedOut === 0n) return 0n
  return (expectedOut * BigInt(10_000 - slippageBps)) / 10_000n
}

/** On-chain quote + correct function for the deployed swap contract. */
export async function buildBobbieSwapWriteCall(
  client: PublicClient,
  swapAddr: Address,
  fromSymbol: SwapSymbol,
  toSymbol: SwapSymbol,
  amountIn: bigint,
  slippageBps = 100,
): Promise<BobbieSwapWriteCall> {
  const variant = await detectBobbieSwapVariant(client, swapAddr)
  if (variant === "unknown") {
    throw new Error("ARC//_SWAP_ADDR · swap contract at configured address is not recognized")
  }

  if (variant === "legacy") {
    if (fromSymbol === "USDC" && toSymbol === "ARC") {
      const expectedOut = await client.readContract({
        address: swapAddr,
        abi: bobbieSwapAbi,
        functionName: "quoteArcOut",
        args: [amountIn],
      })
      const minOut = applySlippage(expectedOut, slippageBps)
      if (minOut === 0n) throw new Error("ARC//_DUST · amount rounds to zero on-chain")
      return {
        variant: "legacy",
        functionName: "swapUsdcForArc",
        args: [amountIn, minOut] as const,
        expectedOut,
      }
    }
    if (fromSymbol === "ARC" && toSymbol === "USDC") {
      const expectedOut = await client.readContract({
        address: swapAddr,
        abi: bobbieSwapAbi,
        functionName: "quoteUsdcOut",
        args: [amountIn],
      })
      const minOut = applySlippage(expectedOut, slippageBps)
      if (minOut === 0n) throw new Error("ARC//_DUST · amount rounds to zero on-chain")
      return {
        variant: "legacy",
        functionName: "swapArcForUsdc",
        args: [amountIn, minOut] as const,
        expectedOut,
      }
    }
    throw new Error(
      "ARC//_LEGACY_PAIR · this deployment only supports USDC ↔ ARC; run npm run deploy:bobbieswap for multi-asset swaps",
    )
  }

  const fromId = SWAP_TOKEN_ID[fromSymbol]
  const toId = SWAP_TOKEN_ID[toSymbol]
  const expectedOut = await client.readContract({
    address: swapAddr,
    abi: bobbieSwapAbi,
    functionName: "quoteOut",
    args: [fromId, toId, amountIn],
  })
  const minOut = applySlippage(expectedOut, slippageBps)
  if (minOut === 0n) throw new Error("ARC//_DUST · amount rounds to zero on-chain")
  return {
    variant: "multi",
    functionName: "swap",
    args: [fromId, toId, amountIn, minOut] as const,
    expectedOut,
  }
}

export function bobbieSwapOnChainLabel(call: BobbieSwapWriteCall): string {
  if (call.functionName === "swapUsdcForArc") return "swapUsdcForArc()"
  if (call.functionName === "swapArcForUsdc") return "swapArcForUsdc()"
  const [, toId] = call.args
  const to =
    (Object.entries(SWAP_TOKEN_ID).find(([, id]) => id === toId)?.[0] as SwapSymbol | undefined) ?? "?"
  const fromId = call.args[0]
  const from =
    (Object.entries(SWAP_TOKEN_ID).find(([, id]) => id === fromId)?.[0] as SwapSymbol | undefined) ?? "?"
  return `swap(${from}→${to})`
}

/** Resolve demo token addresses from BobbieMultiSwap on-chain (overrides zero codegen stubs). */
export function mergePortfolioTokenAddresses(
  tokens: ArcPortfolioTokenMeta[],
  onChain: Partial<Record<"ARC" | "ETH" | "WBTC", Address>>,
): ArcPortfolioTokenMeta[] {
  return tokens.map((t) => {
    const resolved = onChain[t.symbol as keyof typeof onChain]
    if (resolved) return { ...t, address: resolved }
    return t
  })
}
