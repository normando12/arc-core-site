"use client"

import { useMemo } from "react"
import { erc20Abi, formatUnits } from "viem"
import { useAccount, useChainId, useReadContracts } from "wagmi"
import { arcTestnet } from "@/lib/chains/arc-testnet"
import {
  buildSwapPortfolioTokenList,
  isPortfolioTokenOnChain,
  type ArcPortfolioTokenMeta,
} from "@/lib/arc-testnet-portfolio"
import {
  bobbieSwapAbi,
  getBobbieSwapAddress,
  mergePortfolioTokenAddresses,
} from "@/lib/bobbie-swap"
import type { Address } from "viem"

export type ArcPortfolioRow = {
  meta: ArcPortfolioTokenMeta
  balance: bigint
  formatted: string
  /** false when demo token address is not deployed yet */
  onChain: boolean
}

export type ArcPortfolioState =
  | { kind: "disconnected"; rows: ArcPortfolioRow[]; refetch: () => void }
  | { kind: "wrong_chain"; chainId: number; rows: ArcPortfolioRow[]; refetch: () => void }
  | { kind: "loading"; rows: ArcPortfolioRow[]; refetch: () => void }
  | { kind: "error"; rows: ArcPortfolioRow[]; message: string; refetch: () => void }
  | { kind: "ready"; rows: ArcPortfolioRow[]; refetch: () => void }

function trimDecimalString(s: string): string {
  if (!s.includes(".")) return s
  return s.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "")
}

export function useArcPortfolioBalances(): ArcPortfolioState {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const ZERO = "0x0000000000000000000000000000000000000000" as Address
  const baseTokens = useMemo(() => buildSwapPortfolioTokenList(), [])
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
    query: { enabled: demoAddrContracts.length > 0 },
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
    },
  })

  return useMemo((): ArcPortfolioState => {
    const rf = () => {
      void refetch()
    }

    const rowsFromBalances = (readResults: typeof data): ArcPortfolioRow[] => {
      let readIdx = 0
      return tokens.map((meta) => {
        if (!isPortfolioTokenOnChain(meta)) {
          return { meta, balance: 0n, formatted: "0", onChain: false }
        }
        const r = readResults?.[readIdx++]
        const balance = r?.status === "success" && typeof r.result === "bigint" ? r.result : 0n
        const formatted = trimDecimalString(formatUnits(balance, meta.decimals))
        return { meta, balance, formatted, onChain: true }
      })
    }

    if (!isConnected || !address) {
      return { kind: "disconnected", rows: rowsFromBalances(undefined), refetch: rf }
    }
    if (chainId !== arcTestnet.id) {
      return { kind: "wrong_chain", chainId, rows: rowsFromBalances(undefined), refetch: rf }
    }
    if (isPending) {
      return { kind: "loading", rows: [], refetch: rf }
    }
    if (isError || data == null) {
      return {
        kind: "error",
        rows: [],
        refetch: rf,
        message: error instanceof Error ? error.message : "Could not read token balances",
      }
    }

    return { kind: "ready", rows: rowsFromBalances(data), refetch: rf }
  }, [address, chainId, data, error, isConnected, isError, isPending, refetch, tokens])
}
