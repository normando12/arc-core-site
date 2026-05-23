import type { Address } from "viem"
import { isAddress } from "viem"

import {
  formatBalanceSummaryResponse,
  formatGasFeesResponse,
  formatMostUsedTokenResponse,
  formatWalletDisconnectedResponse,
  formatWrongChainResponse,
} from "@/lib/ai-response-formatter"
import { parseWalletCommand, type ParsedWalletCommand } from "@/lib/command-parser"
import {
  fetchWalletBalances,
  getDailyGasFees,
  getMostUsedTokenToday,
} from "@/lib/wallet-analytics-service"
import { arcTestnet } from "@/lib/chains/arc-testnet"

export type WalletChatContext = {
  walletAddress?: string
  chainId?: number
}

export type WalletChatResult = {
  text: string
  walletCommand: ParsedWalletCommand["kind"] | null
}

export async function handleWalletCommand(
  message: string,
  ctx: WalletChatContext,
): Promise<WalletChatResult | null> {
  const cmd = parseWalletCommand(message)
  if (!cmd) return null

  if (!ctx.walletAddress || !isAddress(ctx.walletAddress)) {
    return { text: formatWalletDisconnectedResponse(), walletCommand: cmd.kind }
  }

  if (ctx.chainId != null && ctx.chainId !== arcTestnet.id) {
    return { text: formatWrongChainResponse(), walletCommand: cmd.kind }
  }

  const address = ctx.walletAddress as Address

  try {
    switch (cmd.kind) {
      case "most_used_token": {
        const summary = await getMostUsedTokenToday(address, { todayOnly: cmd.todayOnly })
        return {
          text: formatMostUsedTokenResponse(summary),
          walletCommand: cmd.kind,
        }
      }
      case "gas_fees": {
        const summary = await getDailyGasFees(address, { todayOnly: cmd.todayOnly })
        return {
          text: formatGasFeesResponse(summary),
          walletCommand: cmd.kind,
        }
      }
      case "total_balance": {
        const rows = await fetchWalletBalances(address)
        return {
          text: formatBalanceSummaryResponse(rows),
          walletCommand: cmd.kind,
        }
      }
    }
  } catch {
    return {
      text: "Could not read on-chain data right now. Please try again in a moment.",
      walletCommand: cmd.kind,
    }
  }
}
