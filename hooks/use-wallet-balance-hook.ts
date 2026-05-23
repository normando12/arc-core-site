"use client"

import { keepPreviousData, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { erc20Abi, formatUnits } from "viem"
import { useAccount, useChainId, useReadContracts } from "wagmi"
import type { Address } from "viem"

import { arcTestnet } from "@/lib/chains/arc-testnet"
import { buildChatSupportedTokenList } from "@/lib/wallet-token-registry"
import { isPortfolioTokenOnChain } from "@/lib/arc-testnet-portfolio"
import {
  bobbieSwapAbi,
  getBobbieSwapAddress,
  mergePortfolioTokenAddresses,
} from "@/lib/bobbie-swap"

export type WalletBalanceRow = {
  symbol: string
  name: string
  formatted: string
  balance: bigint
  onChain: boolean
}

export type WalletBalanceState =
  | { kind: "disconnected"; rows: WalletBalanceRow[]; refetch: () => Promise<void> }
  | { kind: "wrong_chain"; chainId: number; rows: WalletBalanceRow[]; refetch: () => Promise<void> }
  | { kind: "loading"; rows: WalletBalanceRow[]; refetch: () => Promise<void> }
  | { kind: "error"; rows: WalletBalanceRow[]; message: string; refetch: () => Promise<void> }
  | { kind: "ready"; rows: WalletBalanceRow[]; refetch: () => Promise<void> }

function trimDecimalString(s: string): string {
  if (!s.includes(".")) return s
  return s.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "")
}

const REFRESH_DELAYS_MS = [0, 1200, 2800] as const

/**
 * Reads USDC, ARC, ETH, EURC, and WBTC balances for chat wallet commands.
 */
export function useWalletBalanceHook(): WalletBalanceState {
  const queryClient = useQueryClient()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const ZERO = "0x0000000000000000000000000000000000000000" as Address
  const baseTokens = useMemo(() => buildChatSupportedTokenList(), [])
  const swapAddr = getBobbieSwapAddress()
  const onArc = Boolean(isConnected && address && chainId === arcTestnet.id)

  const demoAddrContracts = useMemo(() => {
    if (!swapAddr || !onArc) return []
    return (["arcToken", "ethToken", "wbtcToken"] as const).map((functionName) => ({
      chainId: arcTestnet.id,
      address: swapAddr,
      abi: bobbieSwapAbi,
      functionName,
    }))
  }, [onArc, swapAddr])

  const { data: demoAddrData } = useReadContracts({
    contracts: demoAddrContracts,
    query: { enabled: demoAddrContracts.length > 0, staleTime: 0 },
  })

  const tokens = useMemo(() => {
    const onChain: Partial<Record<"ARC" | "ETH" | "WBTC", Address>> = {}
    if (demoAddrData) {
      const keys = ["ARC", "ETH", "WBTC"] as const
      demoAddrData.forEach((r, i) => {
        if (r?.status === "success" && typeof r.result === "string" && r.result !== ZERO) {
          onChain[keys[i]] = r.result as Address
        }
      })
    }
    return mergePortfolioTokenAddresses(baseTokens, onChain)
  }, [ZERO, baseTokens, demoAddrData])

  const onChainTokens = useMemo(() => tokens.filter(isPortfolioTokenOnChain), [tokens])

  const contracts = useMemo(() => {
    if (!address || !onArc) return []
    return onChainTokens.map((t) => ({
      chainId: arcTestnet.id,
      address: t.address!,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }))
  }, [address, onArc, onChainTokens])

  const { data, isPending, isError, refetch, error } = useReadContracts({
    contracts,
    query: {
      enabled: onArc && contracts.length > 0,
      staleTime: 0,
      gcTime: 30_000,
      placeholderData: keepPreviousData,
    },
  })

  const refreshBalances = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["readContracts"] })
    for (const delay of REFRESH_DELAYS_MS) {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      await refetch()
    }
  }, [queryClient, refetch])

  return useMemo((): WalletBalanceState => {
    const rowsFromBalances = (readResults: typeof data): WalletBalanceRow[] => {
      let readIdx = 0
      return tokens.map((meta) => {
        if (!isPortfolioTokenOnChain(meta)) {
          return { symbol: meta.symbol, name: meta.name, balance: 0n, formatted: "0", onChain: false }
        }
        const r = readResults?.[readIdx++]
        const balance = r?.status === "success" && typeof r.result === "bigint" ? r.result : 0n
        return {
          symbol: meta.symbol,
          name: meta.name,
          balance,
          formatted: trimDecimalString(formatUnits(balance, meta.decimals)),
          onChain: true,
        }
      })
    }

    if (!isConnected || !address) {
      return { kind: "disconnected", rows: rowsFromBalances(undefined), refetch: refreshBalances }
    }
    if (chainId !== arcTestnet.id) {
      return { kind: "wrong_chain", chainId, rows: rowsFromBalances(undefined), refetch: refreshBalances }
    }
    if (isPending && data === undefined) {
      return { kind: "loading", rows: [], refetch: refreshBalances }
    }
    if (isError || data == null) {
      return {
        kind: "error",
        rows: rowsFromBalances(data),
        refetch: refreshBalances,
        message: error instanceof Error ? error.message : "Could not read token balances",
      }
    }

    return { kind: "ready", rows: rowsFromBalances(data), refetch: refreshBalances }
  }, [
    address,
    chainId,
    data,
    error,
    isConnected,
    isError,
    isPending,
    refreshBalances,
    tokens,
  ])
}
