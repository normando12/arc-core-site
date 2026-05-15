"use client"

import { useMemo } from "react"
import { erc20Abi, formatUnits } from "viem"
import { useAccount, useChainId, useReadContracts } from "wagmi"
import { arcTestnet } from "@/lib/chains/arc-testnet"
import { buildArcPortfolioTokenList, type ArcPortfolioTokenMeta } from "@/lib/arc-testnet-portfolio"

export type ArcPortfolioRow = {
  meta: ArcPortfolioTokenMeta
  balance: bigint
  formatted: string
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
  const tokens = useMemo(() => buildArcPortfolioTokenList(), [])

  const onArc = Boolean(isConnected && address && chainId === arcTestnet.id)

  const contracts = useMemo(() => {
    if (!address || !onArc) return []
    return tokens.map((t) => ({
      chainId: arcTestnet.id,
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }))
  }, [address, onArc, tokens])

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

    if (!isConnected || !address) {
      return { kind: "disconnected", rows: [], refetch: rf }
    }
    if (chainId !== arcTestnet.id) {
      return { kind: "wrong_chain", chainId, rows: [], refetch: rf }
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

    const rows: ArcPortfolioRow[] = tokens.map((meta, i) => {
      const r = data[i]
      const balance = r?.status === "success" && typeof r.result === "bigint" ? r.result : 0n
      const formatted = trimDecimalString(formatUnits(balance, meta.decimals))
      return { meta, balance, formatted }
    })

    return { kind: "ready", rows, refetch: rf }
  }, [address, chainId, data, error, isConnected, isError, isPending, refetch, tokens])
}
