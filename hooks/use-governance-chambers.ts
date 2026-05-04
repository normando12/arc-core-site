"use client"

import { useMemo } from "react"
import { useAccount, useReadContract, useReadContracts } from "wagmi"
import { zeroAddress } from "viem"
import {
  getGovernanceAddress,
  governanceAbi,
  isGovernanceConfigured,
} from "@/lib/governance-contract"

export type ChamberRow = {
  id: string
  numericId: bigint
  title: string
  description: string
  quorumPercent: number
  forVotes: bigint
  againstVotes: bigint
  userVote: "yes" | "no" | null
}

type ChamberStruct = {
  id: bigint
  title: string
  description: string
  forVotes: bigint
  againstVotes: bigint
}

function parseChamber(raw: unknown): ChamberStruct | null {
  if (raw && typeof raw === "object" && "title" in raw && "forVotes" in raw) {
    return raw as ChamberStruct
  }
  if (Array.isArray(raw) && raw.length >= 5) {
    return {
      id: raw[0] as bigint,
      title: raw[1] as string,
      description: raw[2] as string,
      forVotes: raw[3] as bigint,
      againstVotes: raw[4] as bigint,
    }
  }
  return null
}

export function useGovernanceChambers() {
  const contractAddress = getGovernanceAddress()
  const configured = isGovernanceConfigured(contractAddress)
  const { address: user } = useAccount()

  const {
    data: chamberCount,
    isLoading: loadingCount,
    error: countError,
  } = useReadContract({
    address: contractAddress,
    abi: governanceAbi,
    functionName: "chamberCount",
    query: { enabled: configured },
  })

  const n = chamberCount != null ? Number(chamberCount) : 0
  const ids = useMemo(
    () => (n > 0 ? Array.from({ length: n }, (_, i) => BigInt(i + 1)) : []),
    [n]
  )

  const contracts = useMemo(() => {
    if (!configured || ids.length === 0) return []
    const voter = user ?? zeroAddress
    return ids.flatMap((id) => [
      {
        address: contractAddress,
        abi: governanceAbi,
        functionName: "getChamber" as const,
        args: [id] as const,
      },
      {
        address: contractAddress,
        abi: governanceAbi,
        functionName: "userVoteSide" as const,
        args: [id, voter] as const,
      },
    ])
  }, [contractAddress, configured, ids, user])

  const { data, isLoading: loadingReads, refetch, error: readsError } =
    useReadContracts({
      contracts,
      query: { enabled: configured && contracts.length > 0 },
    })

  const chambers: ChamberRow[] = useMemo(() => {
    if (!data || ids.length === 0) return []
    const rows: ChamberRow[] = []
    for (let i = 0; i < ids.length; i++) {
      const chRes = data[i * 2]
      const voteRes = data[i * 2 + 1]
      if (!chRes || chRes.status !== "success") continue
      const c = parseChamber(chRes.result)
      if (!c) continue

      let userVote: "yes" | "no" | null = null
      if (voteRes?.status === "success") {
        const raw = voteRes.result as unknown
        const side =
          typeof raw === "bigint"
            ? Number(raw)
            : typeof raw === "number"
              ? raw
              : 0
        if (side === 1) userVote = "yes"
        else if (side === 2) userVote = "no"
      }

      const fv = Number(c.forVotes)
      const av = Number(c.againstVotes)
      const total = fv + av
      const quorumPercent = total > 0 ? Math.round((fv / total) * 100) : 0

      rows.push({
        id: String(c.id).padStart(3, "0"),
        numericId: c.id,
        title: c.title,
        description: c.description,
        quorumPercent,
        forVotes: c.forVotes,
        againstVotes: c.againstVotes,
        userVote,
      })
    }
    return rows
  }, [data, ids])

  return {
    contractAddress,
    configured,
    chambers,
    chamberCount: n,
    isLoading: configured && (loadingCount || loadingReads),
    refetch,
    countError,
    readsError,
  }
}
