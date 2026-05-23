import type { GasFeeSummary } from "@/lib/gas-fee-calculator"
import type { TokenUsageSummary } from "@/lib/wallet-analytics-service"
import type { OnChainBalanceRow } from "@/lib/wallet-analytics-service"
import type { WalletBalanceRow } from "@/hooks/use-wallet-balance-hook"

type BalanceLine = Pick<WalletBalanceRow, "symbol" | "formatted" | "balance" | "onChain">

export function formatMostUsedTokenResponse(summary: TokenUsageSummary): string {
  if (summary.totalInteractions === 0) {
    if (summary.todayOnly) {
      return "Não encontrei interações com tokens na sua wallet hoje na ARC Network. Faça um swap ou transferência e pergunte de novo."
    }
    return "Ainda não há histórico de interações com tokens registrado para esta wallet na ARC Network."
  }

  const period = summary.todayOnly ? " hoje" : ""
  const txWord = summary.count === 1 ? "transação" : "transações"

  if (summary.count === 1 && summary.runnersUp.length === 0) {
    return `O token que você mais utilizou${period} foi ${summary.symbol} com ${summary.count} ${txWord}.`
  }

  const runners =
    summary.runnersUp.length > 0
      ? ` (${summary.runnersUp.map((r) => `${r.symbol}: ${r.count}`).join(", ")})`
      : ""

  return `O token que você mais utilizou${period} foi ${summary.symbol} com ${summary.count} ${txWord}${runners}.`
}

export function formatGasFeesResponse(summary: GasFeeSummary): string {
  const period = summary.todayOnly ? "Hoje você gastou" : "Você gastou no total"
  const txNote =
    summary.transactionCount === 0
      ? ""
      : summary.transactionCount === 1
        ? " (1 transação)"
        : ` (${summary.transactionCount} transações)`

  if (summary.transactionCount === 0) {
    if (summary.todayOnly) {
      return "Hoje você ainda não pagou taxas de gas na ARC Network com esta wallet."
    }
    return "Não encontrei taxas de gas pagas por esta wallet no histórico recente da ARC Network."
  }

  return `${period} ${summary.totalUsdc} USDC em taxas na ARC Network${txNote}.`
}

export function formatBalanceSummaryResponse(rows: BalanceLine[] | OnChainBalanceRow[]): string {
  const nonZero = rows.filter((r) => r.onChain && r.balance > 0n)
  const ordered = rows.filter((r) => r.onChain)

  if (nonZero.length === 0) {
    const listed = ordered.map((r) => `${r.symbol}: 0`).join("\n")
    return `Seu saldo atual é:\n${listed}\n\nConecte-se à Arc Testnet e use o faucet se precisar de USDC para gas.`
  }

  const lines = ordered.map((r) => `${r.formatted} ${r.symbol}`)
  return `Seu saldo atual é:\n${lines.join("\n")}`
}

export function formatWalletDisconnectedResponse(): string {
  return "Conecte sua wallet na Arc Testnet para eu consultar saldos, taxas e histórico on-chain."
}

export function formatWrongChainResponse(): string {
  return "Troque para a Arc Testnet (chain 5042002) para eu ler seus dados on-chain."
}
