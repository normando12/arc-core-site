"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContract,
  useReadContracts,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import { parseEventLogs, zeroAddress } from "viem"
import { toast } from "sonner"
import {
  Sparkles,
  Wallet,
  Activity,
  ChevronRight,
  Globe,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  X,
  CheckCircle,
  Gauge,
} from "lucide-react"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { arcTestnet, ARC_EXPLORER_TX } from "@/lib/chains/arc-testnet"
import { formatArcTxError } from "@/lib/arc-tx-errors"
import { arcErr, arcLog, shortHex } from "@/lib/arc-log"
import { playTxSuccessSound } from "@/lib/tx-success-sound"
import {
  getGovernanceAddress,
  governanceAbi,
  isGovernanceConfigured,
} from "@/lib/governance-contract"
import { useGovernanceChambers } from "@/hooks/use-governance-chambers"
import {
  PRESENCE_TIERS,
  tierForPresenceScore,
  tierProgressWithinBand,
  voteWeightBpsFromPresenceScore,
} from "@/lib/presence-tier"

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function ArcDApp() {
  const queryClient = useQueryClient()
  const contractAddress = useMemo(() => getGovernanceAddress(), [])
  const configured = isGovernanceConfigured(contractAddress)

  const { address, isConnected, status: accountStatus } = useAccount()
  const chainId = useChainId()
  const { connectAsync, connectors, isPending: connectPending } = useConnect()
  const { disconnectAsync, isPending: disconnectPending } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  const {
    chambers,
    chamberCount,
    isLoading: chambersLoading,
    refetch: refetchChambers,
    countError,
    readsError,
  } = useGovernanceChambers()

  const { data: presencePerVoteOnChain } = useReadContract({
    address: contractAddress,
    abi: governanceAbi,
    functionName: "PRESENCE_PER_VOTE",
    query: { enabled: configured },
  })

  const presencePointsPerVote = useMemo(() => {
    if (presencePerVoteOnChain == null) return 20
    return Number(presencePerVoteOnChain as bigint)
  }, [presencePerVoteOnChain])

  const gmPresenceContracts = useMemo(() => {
    if (!configured || !address) return []
    const a = contractAddress
    return [
      {
        address: a,
        abi: governanceAbi,
        functionName: "presenceScore" as const,
        args: [address] as const,
      },
      {
        address: a,
        abi: governanceAbi,
        functionName: "voteWeight" as const,
        args: [address] as const,
      },
      {
        address: a,
        abi: governanceAbi,
        functionName: "gmBurstDay" as const,
        args: [address] as const,
      },
      {
        address: a,
        abi: governanceAbi,
        functionName: "gmBurstsToday" as const,
        args: [address] as const,
      },
      {
        address: a,
        abi: governanceAbi,
        functionName: "gmNextFragment" as const,
        args: [address] as const,
      },
    ] as const
  }, [configured, address, contractAddress])

  const { data: gmPresenceReads, refetch: refetchGmPresence } = useReadContracts({
    contracts: [...gmPresenceContracts],
    query: { enabled: gmPresenceContracts.length > 0 },
  })

  const presenceScoreOnChain = useMemo(() => {
    const r = gmPresenceReads?.[0]
    if (r?.status !== "success" || r.result == null) return 0
    return Number(r.result as bigint)
  }, [gmPresenceReads])

  /** Confirmed total from vote receipt (RPC multicall can lag behind state). */
  const [presenceScoreAnchor, setPresenceScoreAnchor] = useState<number | null>(null)

  const presenceScoreDisplay = useMemo(() => {
    if (presenceScoreAnchor == null) return presenceScoreOnChain
    return Math.max(presenceScoreOnChain, presenceScoreAnchor)
  }, [presenceScoreOnChain, presenceScoreAnchor])

  useEffect(() => {
    if (presenceScoreAnchor == null) return
    if (presenceScoreOnChain >= presenceScoreAnchor) setPresenceScoreAnchor(null)
  }, [presenceScoreOnChain, presenceScoreAnchor])

  const voteWeightBps = useMemo(() => {
    const r = gmPresenceReads?.[1]
    const fromFallback = voteWeightBpsFromPresenceScore(presenceScoreDisplay)
    if (r?.status === "success" && r.result != null) {
      return Math.max(Number(r.result as bigint), fromFallback)
    }
    return fromFallback
  }, [gmPresenceReads, presenceScoreDisplay])

  const gmBurstDayOnChain = useMemo(() => {
    const r = gmPresenceReads?.[2]
    if (r?.status !== "success" || r.result == null) return 0n
    return r.result as bigint
  }, [gmPresenceReads])

  const gmBurstsTodayOnChain = useMemo(() => {
    const r = gmPresenceReads?.[3]
    if (r?.status !== "success" || r.result == null) return 0n
    return r.result as bigint
  }, [gmPresenceReads])

  const gmNextFragmentOnChain = useMemo(() => {
    const r = gmPresenceReads?.[4]
    if (r?.status !== "success" || r.result == null) return 0
    return Number(r.result as number | bigint)
  }, [gmPresenceReads])

  const utcDayNow = Math.floor(Date.now() / 1000 / 86_400)
  const gmBurstsTodayEffective =
    Number(gmBurstDayOnChain) === utcDayNow ? Number(gmBurstsTodayOnChain) : 0
  const gmNextFragmentEffective =
    Number(gmBurstDayOnChain) === utcDayNow ? gmNextFragmentOnChain : 0
  const gmBurstsRemaining = Math.max(0, 10 - gmBurstsTodayEffective)

  const presenceTier = useMemo(
    () => tierForPresenceScore(presenceScoreDisplay),
    [presenceScoreDisplay]
  )

  const tierBandProgress = useMemo(
    () => tierProgressWithinBand(presenceScoreDisplay),
    [presenceScoreDisplay]
  )

  const ringRadius = 52
  const ringCirc = 2 * Math.PI * ringRadius
  const ringDash = tierBandProgress * ringCirc

  const [gmButtonGreen, setGmButtonGreen] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [transactionData, setTransactionData] = useState<{
    type: "gm" | "vote"
    txHash: string
    gmTxHashes?: string[]
    voteType?: "yes" | "no"
    proposalTitle?: string
    voteWeightBps?: number
    votePresencePts?: number
  } | null>(null)

  const [gmWaveBusy, setGmWaveBusy] = useState(false)
  const [voteHash, setVoteHash] = useState<`0x${string}` | undefined>()
  const [voteMeta, setVoteMeta] = useState<{
    title: string
    side: "yes" | "no"
    weightBps: number
  } | null>(null)
  const [votePending, setVotePending] = useState<{
    id: bigint
    side: "yes" | "no"
  } | null>(null)

  const voteReceipt = useWaitForTransactionReceipt({
    hash: voteHash,
    chainId: arcTestnet.id,
  })

  const publicClient = usePublicClient({ chainId: arcTestnet.id })
  const { writeContractAsync: gmWriteAsync, isPending: gmSubmitting } =
    useWriteContract()
  const { writeContractAsync: voteWriteAsync, isPending: voteSubmitting } =
    useWriteContract()

  const gmBusy = gmWaveBusy || gmSubmitting
  const voteBusy = voteSubmitting || Boolean(voteHash && voteReceipt.isLoading)

  const handledVote = useRef<string | undefined>(undefined)

  const fireConfetti = useCallback(() => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) {
        return clearInterval(interval)
      }
      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#4D88FF", "#00FF41", "#00E0FF", "#ffffff"],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#4D88FF", "#00FF41", "#00E0FF", "#ffffff"],
      })
    }, 250)
  }, [])

  useEffect(() => {
    if (!voteHash || !voteReceipt.isSuccess || !voteMeta || handledVote.current === voteHash)
      return
    handledVote.current = voteHash
    arcLog("ARC//_MINED", `vote · ${voteHash}`)
    toast.message(`[ARC//_MINED] ${shortHex(voteHash)}`)
    toast.message(`[ARC//_PRESENCE] +${presencePointsPerVote} pts · voting participation`)
    fireConfetti()
    void playTxSuccessSound()
    setTransactionData({
      type: "vote",
      txHash: voteHash,
      voteType: voteMeta.side,
      proposalTitle: voteMeta.title,
      voteWeightBps: voteMeta.weightBps,
      votePresencePts: presencePointsPerVote,
    })
    setShowSuccessPopup(true)

    const receipt = voteReceipt.data
    if (receipt?.logs?.length) {
      try {
        const logs = parseEventLogs({
          abi: governanceAbi,
          logs: receipt.logs,
          eventName: "VoteCast",
        })
        const last = logs[logs.length - 1]
        const raw = last?.args?.newPresenceScore
        if (raw != null) setPresenceScoreAnchor(Number(raw as bigint))
      } catch {
        /* ignore malformed log edge cases */
      }
    }

    void (async () => {
      await refetchGmPresence()
      await refetchChambers()
      void queryClient.invalidateQueries()
    })()

    setVoteHash(undefined)
    setVoteMeta(null)
    setVotePending(null)
  }, [
    voteHash,
    voteReceipt.isSuccess,
    voteReceipt.data,
    voteMeta,
    fireConfetti,
    queryClient,
    refetchChambers,
    refetchGmPresence,
    presencePointsPerVote,
  ])

  useEffect(() => {
    if (countError) arcErr("ARC//_READ_FAIL", countError.message)
    if (readsError) arcErr("ARC//_READ_FAIL", readsError.message)
  }, [countError, readsError])

  const wrongChain = isConnected && chainId !== arcTestnet.id

  const shareOnX = () => {
    if (!transactionData) return
    let message = ""
    if (transactionData.type === "gm") {
      message =
        "I just said GM on @arc testnet — Proof of Presence burst (10 pulses, 1 tx) · ARC CORE. @sonic_fx0"
    } else {
      const w = transactionData.voteWeightBps
        ? ` · vote weight ${(transactionData.voteWeightBps / 100).toFixed(1)}×`
        : ""
      message = `I voted ${transactionData.voteType?.toUpperCase()} on "${transactionData.proposalTitle}" @arc testnet${w}. @sonic_fx0`
    }
    const txUrl = ARC_EXPLORER_TX(transactionData.txHash)
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${message}\n\nTX · ${txUrl}`)}`
    window.open(tweetUrl, "_blank")
  }

  async function ensureArcChain(): Promise<boolean> {
    if (chainId === arcTestnet.id) return true
    if (!switchChainAsync) {
      toast.error("ARC//_CHAIN_FAULT · wallet cannot switch network")
      return false
    }
    try {
      await switchChainAsync({ chainId: arcTestnet.id })
      arcLog("ARC//_CHAIN_SWITCH", String(arcTestnet.id))
      return true
    } catch (e) {
      toast.error(formatArcTxError(e))
      return false
    }
  }

  async function handleConnectProtocol() {
    if (isConnected) {
      try {
        await disconnectAsync()
        arcLog("ARC//_SESSION_CLEAR", "wallet disconnected")
      } catch (e) {
        arcErr("ARC//_DISCONNECT_FAIL", formatArcTxError(e))
        toast.error(formatArcTxError(e))
      }
      return
    }
    const injected = connectors.find((c) => c.id === "injected" || c.type === "injected")
    const connector = injected ?? connectors[0]
    if (!connector) {
      toast.error("ARC//_CONNECTOR_NULL · no injected surface detected")
      return
    }
    try {
      await connectAsync({ connector, chainId: arcTestnet.id })
      arcLog("ARC//_SESSION_OPEN", "wallet linked · Arc Testnet")
    } catch (e) {
      arcErr("ARC//_CONNECT_FAIL", formatArcTxError(e))
      toast.error(formatArcTxError(e))
    }
  }

  async function handleGM() {
    if (!configured) {
      toast.error("ARC//_NODE · governance contract not bound — deploy + codegen")
      return
    }
    if (!isConnected || !address) {
      toast.error("ARC//_WALLET_REQUIRED · connect protocol first")
      return
    }
    if (!(await ensureArcChain())) return
    if (!publicClient) {
      toast.error("ARC//_RPC · public client unavailable")
      return
    }
    if (gmBurstsRemaining <= 0 && gmNextFragmentEffective === 0) {
      toast.error("ARC//_DAILY_GM_CAP · 10 SAY GM waves already sealed today (UTC day)")
      return
    }

    setGmWaveBusy(true)
    try {
      arcLog("ARC//_TX_BROADCAST", "emitGmBurst")
      const hash = await gmWriteAsync({
        address: contractAddress,
        abi: governanceAbi,
        functionName: "emitGmBurst",
        chainId: arcTestnet.id,
      })
      await publicClient.waitForTransactionReceipt({
        hash,
        chainId: arcTestnet.id,
      })
      arcLog("ARC//_MINED", `emitGmBurst · ${hash}`)
      toast.message(`[ARC//_MINED] ${shortHex(hash)}`)
      fireConfetti()
      void playTxSuccessSound()
      setGmButtonGreen(true)
      setTimeout(() => setGmButtonGreen(false), 2000)
      setTransactionData({
        type: "gm",
        txHash: hash,
      })
      setShowSuccessPopup(true)
      if (address) {
        try {
          const s = await publicClient.readContract({
            address: contractAddress,
            abi: governanceAbi,
            functionName: "presenceScore",
            args: [address],
          })
          setPresenceScoreAnchor(Number(s as bigint))
        } catch {
          /* fall back to refetch only */
        }
      }
      await refetchGmPresence()
      void queryClient.invalidateQueries()
      void refetchChambers()
    } catch (e) {
      arcErr("ARC//_GM_FAIL", formatArcTxError(e))
      toast.error(formatArcTxError(e))
    } finally {
      setGmWaveBusy(false)
    }
  }

  async function handleVote(chamberId: bigint, title: string, vote: "yes" | "no") {
    if (!configured) {
      toast.error("ARC//_NODE · governance contract not bound")
      return
    }
    if (!isConnected) {
      toast.error("ARC//_WALLET_REQUIRED · connect protocol first")
      return
    }
    if (!(await ensureArcChain())) return
    setVotePending({ id: chamberId, side: vote })
    try {
      const weightBps = voteWeightBpsFromPresenceScore(presenceScoreDisplay)
      arcLog("ARC//_TX_BROADCAST", `vote · chamber ${chamberId} · weight ${weightBps}`)
      const hash = await voteWriteAsync({
        address: contractAddress,
        abi: governanceAbi,
        functionName: "vote",
        args: [chamberId, vote === "yes"],
        chainId: arcTestnet.id,
      })
      setVoteMeta({ title, side: vote, weightBps })
      setVoteHash(hash)
    } catch (e) {
      setVotePending(null)
      arcErr("ARC//_VOTE_FAIL", formatArcTxError(e))
      toast.error(formatArcTxError(e))
    }
  }

  const walletLabel = useMemo(() => {
    if (!isConnected || !address) return "CONNECT WALLET"
    return shortHex(address, 6, 4).toUpperCase()
  }, [isConnected, address])

  const connectBusy = connectPending || disconnectPending || accountStatus === "connecting"

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#0a1628] text-white font-sans selection:bg-arc-blue/30">
      {!configured && (
        <div className="w-full bg-black/40 border-b border-white/10 py-2 px-4 text-center font-mono text-[10px] tracking-widest text-white/50 uppercase">
          [ARC//_NODE] governance contract not bound — run{" "}
          <span className="text-arc-cyan">npm run deploy:arc</span> then refresh (or set{" "}
          <span className="text-arc-cyan">NEXT_PUBLIC_ARC_GOVERNANCE_ADDRESS</span>)
        </div>
      )}

      {wrongChain && (
        <div className="w-full bg-arc-blue/10 border-b border-arc-blue/30 py-2 px-4 flex flex-wrap items-center justify-center gap-3 font-mono text-[10px] text-arc-cyan uppercase tracking-widest">
          [ARC//_CHAIN_MISMATCH] expected Arc Testnet · 5042002
          <button
            type="button"
            onClick={() => void ensureArcChain()}
            className="border border-arc-cyan/40 px-3 py-1 rounded-sm hover:bg-arc-cyan/10"
          >
            SWITCH NETWORK
          </button>
        </div>
      )}

      {showSuccessPopup && transactionData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setShowSuccessPopup(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#0d1a2d] border border-arc-green/30 rounded-lg p-8 max-w-md w-full shadow-2xl shadow-arc-green/10"
          >
            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-arc-green/20 rounded-full flex items-center justify-center">
                <CheckCircle size={40} className="text-arc-green" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-2 text-white">
              Transaction Successful
            </h3>
            <p className="text-center text-white/60 mb-6 font-mono text-xs uppercase tracking-wide">
              {transactionData.type === "gm"
                ? "One transaction · 10 presence pulses (GMSignal 0–9) sealed on Arc Testnet."
                : `Ballot sealed · ${transactionData.voteType?.toUpperCase()}${
                    transactionData.voteWeightBps != null
                      ? ` · vote weight ${(transactionData.voteWeightBps / 100).toFixed(1)}×`
                      : ""
                  }${
                    transactionData.votePresencePts != null
                      ? ` · presence +${transactionData.votePresencePts} pts (on-chain)`
                      : ""
                  }.`}
            </p>

            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <p className="text-[10px] text-white/40 mb-2 font-mono tracking-[0.2em]">
                TRANSACTION HASH
              </p>
              <p className="text-sm font-mono text-arc-cyan break-all">
                {transactionData.txHash.slice(0, 20)}…{transactionData.txHash.slice(-10)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={ARC_EXPLORER_TX(transactionData.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium font-mono text-xs uppercase tracking-wider"
              >
                <ExternalLink size={16} />
                View on ArcScan
              </a>

              <button
                type="button"
                onClick={shareOnX}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-arc-blue hover:bg-arc-blue/80 text-black rounded-lg transition-colors text-sm font-bold"
              >
                <TwitterIcon className="w-4 h-4" />
                Share on X
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="w-full bg-arc-blue/10 border-b border-arc-blue/20 py-2">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center gap-6 flex-wrap">
          <a
            href="https://faucet.circle.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-arc-cyan hover:text-white transition-colors"
          >
            <ExternalLink size={12} />
            Faucet USDC
          </a>
          <div className="h-3 w-px bg-white/20" />
          <a
            href="https://www.arc.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-arc-blue hover:text-white transition-colors"
          >
            <Globe size={12} />
            Official Website
          </a>
          <div className="h-3 w-px bg-white/20" />
          <a
            href="https://docs.arc.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-arc-green hover:text-white transition-colors"
          >
            <ExternalLink size={12} />
            Documentation
          </a>
        </div>
      </div>

      <nav className="relative w-full z-10 border-b border-white/10 backdrop-blur-xl bg-[#0a1628]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%7B9EB52675-2C87-473B-910E-E7B89BDA3FBE%7D-5OhxBa0LvZHcX7wCu1e1t4Dq4mFGBg.png"
              alt="Arc Logo"
              className="w-7 h-7 object-contain flex-shrink-0"
            />
            <span className="font-bold tracking-widest text-lg">Arc Core</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/arc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-arc-blue transition-colors"
                aria-label="X"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a
                href="https://discord.com/invite/buildonarc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-arc-blue transition-colors"
                aria-label="Discord"
              >
                <DiscordIcon className="w-5 h-5" />
              </a>
            </div>

            <div className="hidden md:flex gap-4 text-xs font-mono text-white/40">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-arc-green rounded-full" /> TESTNET · 5042002
              </span>
              <span>RPC · USDC</span>
            </div>
            <button
              type="button"
              onClick={() => void handleConnectProtocol()}
              disabled={connectBusy}
              className="px-5 py-2 border border-white/10 rounded-full text-xs font-mono font-medium tracking-wider uppercase hover:bg-arc-blue hover:text-black hover:border-arc-blue transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              <Wallet size={16} />
              {connectBusy ? "…" : isConnected ? walletLabel : "CONNECT WALLET"}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-12 pb-20 max-w-5xl mx-auto px-6">
        <header className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent"
          >
            GOVERNANCE
          </motion.h1>
          <p className="text-arc-gray text-lg font-light tracking-wide max-w-xl mx-auto">
            Interact with the Arc ecosystem through Proof of Presence and decentralized governance.
          </p>
        </header>

        {configured && (
          <section className="mb-16 max-w-3xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1a2d]/95 via-[#0a1628] to-[#0f2240]/90 p-[1px] shadow-[0_0_48px_-8px_rgba(77,136,255,0.25)]">
            <div className="rounded-2xl bg-[#070f1a]/85 backdrop-blur-md px-5 py-6 sm:px-8 sm:py-8">
              {(!isConnected || !address) && (
                <p className="text-center text-[11px] text-arc-cyan/95 mb-5 font-mono uppercase tracking-wide border border-arc-cyan/25 rounded-lg py-2.5 px-3 bg-arc-cyan/5">
                  Connect your wallet on Arc Testnet to load your on-chain score, SAY GM waves, and vote.
                </p>
              )}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 text-arc-cyan">
                  <Gauge className="w-5 h-5 shrink-0" aria-hidden />
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Proof of presence</span>
                </div>
                <a
                  href="https://normando12.github.io/arc-corewhitepaper/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-arc-blue hover:text-white transition-colors border border-arc-blue/30 rounded-full px-3 py-1"
                >
                  ARC CORE whitepaper
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-center">
                <div className="relative w-[140px] h-[140px] shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
                    <circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      className="stroke-white/[0.08]"
                      strokeWidth="6"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={ringRadius}
                      fill="none"
                      className="stroke-[#00E0FF]"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${ringDash} ${ringCirc}`}
                      style={{ filter: "drop-shadow(0 0 6px rgba(0,224,255,0.45))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Score</span>
                    <span className="text-3xl font-bold tabular-nums text-white tracking-tight">
                      {address ? presenceScoreDisplay : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div>
                    <p className="text-xs text-white/45 uppercase tracking-widest mb-1">Current tier</p>
                    <p className="text-lg font-semibold text-white">
                      {presenceTier.label}
                      <span className="text-arc-green font-mono text-sm ml-2">{presenceTier.multiplierLabel}</span>
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">
                      Progress in band toward next tier · {Math.round(tierBandProgress * 100)}%
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-arc-blue to-arc-cyan"
                        initial={{ width: 0 }}
                        animate={{ width: `${tierBandProgress * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {PRESENCE_TIERS.map((t) => (
                      <span
                        key={t.id}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide border ${
                          t.id === presenceTier.id
                            ? "border-arc-cyan/60 bg-arc-cyan/10 text-arc-cyan"
                            : "border-white/10 text-white/35"
                        }`}
                      >
                        {t.rangeLabel} → {t.multiplierLabel}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                        Vote weight (chamber tally)
                      </span>
                      <span className="text-xl font-bold text-arc-green tabular-nums">
                        {address ? `${(voteWeightBps / 100).toFixed(1)}×` : "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/35 mt-2 font-mono uppercase tracking-wider">
                      {address
                        ? `SAY GM today · ${gmBurstsTodayEffective}/10 waves (UTC) · ${gmBurstsRemaining} left`
                        : "SAY GM today · connect wallet to track waves (UTC)"}
                    </p>
                    <div className="flex gap-1 mt-3">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-sm ${
                            i < gmBurstsTodayEffective ? "bg-arc-green" : "bg-white/[0.08]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-col items-center mb-32">
          <div className="relative group">
            <div
              className={`absolute -inset-1 rounded-full blur-xl transition duration-1000 group-hover:duration-200 animate-pulse ${
                gmButtonGreen ? "bg-arc-green opacity-50" : "bg-arc-blue opacity-20 group-hover:opacity-50"
              }`}
            />

            <motion.button
              type="button"
              onClick={() => void handleGM()}
              disabled={
                gmBusy ||
                !configured ||
                !isConnected ||
                wrongChain ||
                (gmBurstsRemaining <= 0 && gmNextFragmentEffective === 0)
              }
              animate={{
                backgroundColor: gmButtonGreen ? "#00FF41" : "#4D88FF",
              }}
              transition={{ duration: 0.3 }}
              className="relative px-12 py-5 text-black font-black text-2xl rounded-full flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: gmButtonGreen ? "#00FF41" : "#4D88FF" }}
            >
              {gmBusy ? (
                <div className="w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  SAY GM <Sparkles size={24} />
                </>
              )}
            </motion.button>
          </div>
          <p className="mt-6 font-mono text-[10px] text-white/30 uppercase tracking-[0.2em] text-center max-w-xl">
            {gmBurstsRemaining <= 0 && gmNextFragmentEffective === 0
              ? "[ARC//_DAILY_GM_CAP] 10 SAY GM waves per UTC day · return after midnight UTC"
              : `One signature · emitGmBurst() · 10 on-chain pulses · ${gmBurstsRemaining}/10 waves left today (UTC)${
                  gmNextFragmentEffective > 0
                    ? ` · incomplete wave — next pulse ${gmNextFragmentEffective + 1}`
                    : ""
                }`}
          </p>
        </section>

        <section>
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <h2 className="flex items-center gap-2 font-semibold text-xl tracking-tight">
              <Activity size={20} className="text-arc-blue" />
              ACTIVE CHAMBERS
            </h2>
            <span className="text-arc-gray text-xs font-mono uppercase tracking-widest">
              {chambersLoading ? "SYNC…" : `Total Proposals: ${chamberCount}`}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {chambers.map((chamber) => (
              <motion.div
                key={chamber.id}
                whileHover={{ borderColor: "rgba(77, 136, 255, 0.4)" }}
                className="p-8 border border-white/10 bg-[#0d1a2d]/80 rounded-sm transition-colors group"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-mono text-arc-gray tracking-widest uppercase">
                    ID: {chamber.id}
                  </span>
                  <div className="flex items-center gap-2 bg-arc-green/5 px-3 py-1 rounded-full border border-arc-green/20">
                    <div className="w-1.5 h-1.5 bg-arc-green rounded-full animate-pulse shadow-[0_0_8px_#00FF41]" />
                    <span className="text-arc-green text-[10px] font-bold uppercase">Active</span>
                  </div>
                </div>

                <h3 className="text-2xl font-medium mb-2 group-hover:text-arc-blue transition-colors line-clamp-2">
                  {chamber.title}
                </h3>
                <p className="text-[11px] font-mono text-white/35 uppercase tracking-wide mb-6 line-clamp-3">
                  {chamber.description}
                </p>

                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/40">QUORUM · FOR / TOTAL</span>
                    <span>{chamber.quorumPercent}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-[2px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${chamber.quorumPercent}%` }}
                      className="bg-arc-cyan h-full shadow-[0_0_10px_#00E0FF]"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 font-mono text-[10px] text-white/30 uppercase tracking-widest">
                    <span>
                      FOR {chamber.forVotes.toString()} · AGAINST {chamber.againstVotes.toString()} · weighted
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-arc-blue opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/5 mt-4">
                    <button
                      type="button"
                      onClick={() => void handleVote(chamber.numericId, chamber.title, "yes")}
                      disabled={
                        voteBusy ||
                        !configured ||
                        !isConnected ||
                        wrongChain ||
                        chamber.userVote !== null
                      }
                      className={`flex-1 py-3 px-4 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        chamber.userVote === "yes"
                          ? "bg-arc-green text-black"
                          : chamber.userVote === "no"
                            ? "bg-white/5 text-white/30 cursor-not-allowed"
                            : "bg-arc-green/10 text-arc-green border border-arc-green/30 hover:bg-arc-green hover:text-black"
                      }`}
                    >
                      {voteBusy && votePending?.id === chamber.numericId && votePending.side === "yes" ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      ) : (
                        <ThumbsUp size={16} />
                      )}
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleVote(chamber.numericId, chamber.title, "no")}
                      disabled={
                        voteBusy ||
                        !configured ||
                        !isConnected ||
                        wrongChain ||
                        chamber.userVote !== null
                      }
                      className={`flex-1 py-3 px-4 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        chamber.userVote === "no"
                          ? "bg-red-500 text-white"
                          : chamber.userVote === "yes"
                            ? "bg-white/5 text-white/30 cursor-not-allowed"
                            : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
                      }`}
                    >
                      {voteBusy && votePending?.id === chamber.numericId && votePending.side === "no" ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ThumbsDown size={16} />
                      )}
                      NO
                    </button>
                  </div>
                  {chamber.userVote && (
                    <p className="text-center text-xs text-arc-cyan font-mono mt-2 uppercase tracking-widest">
                      Sealed · {chamber.userVote === "yes" ? "FOR" : "AGAINST"}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {configured && !chambersLoading && chambers.length === 0 && (
            <p className="mt-8 text-center font-mono text-[10px] text-white/30 uppercase tracking-[0.25em]">
              [ARC//_EMPTY_STATE] no chambers indexed on-chain
            </p>
          )}
        </section>
      </main>

      <footer className="py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-2xl font-bold tracking-wide text-white">
              Building the next layer of global finance.
            </p>
          </div>

          <div className="flex justify-center items-center gap-6 mb-4 flex-wrap">
            <a
              href="https://community.arc.network/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-arc-blue hover:text-white transition-colors font-medium text-sm"
            >
              Join the Arc community
            </a>
            <div className="h-4 w-px bg-white/20" />
            <a
              href="https://normando12.github.io/arc-corewhitepaper/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-arc-cyan hover:text-white transition-colors font-medium text-sm"
            >
              ARC CORE Whitepaper
            </a>
            <div className="h-4 w-px bg-white/20" />
            <a
              href="https://testnet.arcscan.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-arc-green hover:text-white transition-colors font-medium text-sm"
            >
              Arc Testnet Explorer
            </a>
          </div>

          <div className="flex justify-center items-center gap-4">
            <Globe size={14} className="text-white/20" />
            <span className="text-[10px] font-mono text-white/20 tracking-tighter uppercase font-light">
              Arc Core Protocol v1.0.4-Stable
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
