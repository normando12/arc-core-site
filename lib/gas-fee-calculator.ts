import { formatUnits } from "viem"

import type { WalletTransaction } from "@/lib/wallet-analytics-service"

/** Arc Testnet native gas is USDC; RPC returns 18-decimal wei-style units. */
export const ARC_GAS_DECIMALS = 18

export type GasFeeSummary = {
  totalWei: bigint
  totalUsdc: string
  transactionCount: number
  todayOnly: boolean
}

function trimDecimalString(s: string): string {
  if (!s.includes(".")) return s
  return s.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "")
}

function isSameUtcDay(tsSeconds: number, ref = new Date()): boolean {
  const d = new Date(tsSeconds * 1000)
  return (
    d.getUTCFullYear() === ref.getUTCFullYear() &&
    d.getUTCMonth() === ref.getUTCMonth() &&
    d.getUTCDate() === ref.getUTCDate()
  )
}

/**
 * Sums gas paid (gasUsed × gasPrice) for outgoing wallet transactions.
 * Values are formatted as USDC for display on Arc Network.
 */
export function calculateGasFees(
  transactions: WalletTransaction[],
  walletAddress: string,
  options?: { todayOnly?: boolean; now?: Date },
): GasFeeSummary {
  const wallet = walletAddress.toLowerCase()
  const todayOnly = options?.todayOnly ?? false
  const now = options?.now ?? new Date()

  let totalWei = 0n
  let transactionCount = 0

  for (const tx of transactions) {
    if (tx.from.toLowerCase() !== wallet) continue
    if (tx.isError) continue
    if (todayOnly && !isSameUtcDay(tx.timestamp, now)) continue

    totalWei += tx.gasUsed * tx.gasPrice
    transactionCount += 1
  }

  const totalUsdc = trimDecimalString(formatUnits(totalWei, ARC_GAS_DECIMALS))

  return { totalWei, totalUsdc, transactionCount, todayOnly }
}
