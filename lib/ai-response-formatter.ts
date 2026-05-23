import type { GasFeeSummary } from "@/lib/gas-fee-calculator"
import type { TokenUsageSummary } from "@/lib/wallet-analytics-service"
import type { OnChainBalanceRow } from "@/lib/wallet-analytics-service"
import type { WalletBalanceRow } from "@/hooks/use-wallet-balance-hook"

type BalanceLine = Pick<WalletBalanceRow, "symbol" | "formatted" | "balance" | "onChain">

export function formatMostUsedTokenResponse(summary: TokenUsageSummary): string {
  if (summary.totalInteractions === 0) {
    if (summary.todayOnly) {
      return "No token interactions found for your wallet today on ARC Network. Try a swap or transfer and ask again."
    }
    return "No token interaction history is registered for this wallet on ARC Network yet."
  }

  const period = summary.todayOnly ? " today" : ""
  const txWord = summary.count === 1 ? "transaction" : "transactions"

  if (summary.count === 1 && summary.runnersUp.length === 0) {
    return `The token you used most${period} was ${summary.symbol} with ${summary.count} ${txWord}.`
  }

  const runners =
    summary.runnersUp.length > 0
      ? ` (${summary.runnersUp.map((r) => `${r.symbol}: ${r.count}`).join(", ")})`
      : ""

  return `The token you used most${period} was ${summary.symbol} with ${summary.count} ${txWord}${runners}.`
}

export function formatGasFeesResponse(summary: GasFeeSummary): string {
  const period = summary.todayOnly ? "Today you spent" : "You spent in total"
  const txNote =
    summary.transactionCount === 0
      ? ""
      : summary.transactionCount === 1
        ? " (1 transaction)"
        : ` (${summary.transactionCount} transactions)`

  if (summary.transactionCount === 0) {
    if (summary.todayOnly) {
      return "You haven't paid any gas fees on ARC Network with this wallet today."
    }
    return "No gas fees paid by this wallet were found in recent ARC Network history."
  }

  return `${period} ${summary.totalUsdc} USDC in fees on ARC Network${txNote}.`
}

export function formatBalanceSummaryResponse(rows: BalanceLine[] | OnChainBalanceRow[]): string {
  const nonZero = rows.filter((r) => r.onChain && r.balance > 0n)
  const ordered = rows.filter((r) => r.onChain)

  if (nonZero.length === 0) {
    const listed = ordered.map((r) => `${r.symbol}: 0`).join("\n")
    return `Your current balance is:\n${listed}\n\nConnect to Arc Testnet and use the faucet if you need USDC for gas.`
  }

  const lines = ordered.map((r) => `${r.formatted} ${r.symbol}`)
  return `Your current balance is:\n${lines.join("\n")}`
}

export function formatWalletDisconnectedResponse(): string {
  return "Connect your wallet on Arc Testnet so I can read balances, fees, and on-chain history."
}

export function formatWrongChainResponse(): string {
  return "Switch to Arc Testnet (chain 5042002) so I can read your on-chain data."
}
