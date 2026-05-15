"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi"
import {
  Activity,
  ArrowLeftRight,
  Bot,
  ChevronRight,
  Cpu,
  ExternalLink,
  Gauge,
  LayoutGrid,
  Menu,
  MessageSquare,
  Mic,
  PanelRight,
  Send,
  Settings2,
  Sparkles,
  Wallet,
  Waves,
} from "lucide-react"
import { toast } from "sonner"

import { AiExecutionProgressModal, SwapModal, TransactionConfirmModal } from "@/components/arc-ai/arc-ai-modals"
import { FuturisticHeroArt } from "@/components/arc-ai/futuristic-hero-art"
import { PortfolioChart } from "@/components/arc-ai/portfolio-chart"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { estimateMockReceive, type SwapDraft } from "@/lib/arc-ai-parse-swap"
import type { ArcLiveStatus, ChatApiResponse } from "@/lib/arc-api-types"
import { buildAssistantReply } from "@/lib/bobbie-chat-logic"
import {
  AI_INSIGHT,
  GAS_TRACKER,
  MOCK_TOKENS,
  MOCK_TXS,
  PORTFOLIO_SERIES,
  PROMPT_SUGGESTIONS,
  type NavKey,
} from "@/lib/arc-ai-mock-data"
import { arcTestnet, ARC_EXPLORER_ADDRESS, ARC_EXPLORER_TX } from "@/lib/chains/arc-testnet"
import { formatArcTxError } from "@/lib/arc-tx-errors"
import { getBobbieContractAddress } from "@/lib/bobbie-contract"
import {
  getGovernanceAddress,
  governanceAbi,
  isGovernanceConfigured,
} from "@/lib/governance-contract"
import { shortHex } from "@/lib/arc-log"
import { playTxSuccessSound } from "@/lib/tx-success-sound"
import { cn } from "@/lib/utils"
import { useArcLiveStatus } from "@/hooks/use-arc-live-status"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

function TypewriterText({ text }: { text: string }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    setN(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setN(Math.min(i, text.length))
      if (i >= text.length) window.clearInterval(id)
    }, 14)
    return () => window.clearInterval(id)
  }, [text])

  return <span>{text.slice(0, n)}</span>
}

function NavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
        active
          ? "bg-white/[0.08] text-white shadow-[0_0_0_1px_color-mix(in_oklab,var(--arc-neon-cyan)_35%,transparent)]"
          : "text-white/55 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "size-4 transition-transform group-hover:scale-[1.03]",
          active ? "text-[var(--arc-neon-cyan)]" : "text-white/45 group-hover:text-white/70",
        )}
      />
      <span className="font-medium tracking-tight">{label}</span>
      <ChevronRight
        className={cn(
          "ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100",
          active && "opacity-100",
        )}
      />
    </button>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5" aria-label="Assistant is typing">
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-cyan)]/80" />
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-purple)]/80" />
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-magenta)]/70" />
    </div>
  )
}

function LeftSidebar({
  active,
  onNav,
  isWalletConnected,
  walletAddress,
  walletBusy,
  wrongChain,
  onWalletClick,
  onSwitchToArc,
  onOpenSwap,
}: {
  active: NavKey
  onNav: (k: NavKey) => void
  isWalletConnected: boolean
  walletAddress: string | undefined
  walletBusy: boolean
  wrongChain: boolean
  onWalletClick: () => void | Promise<void>
  onSwitchToArc: () => void | Promise<void>
  onOpenSwap: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-1">
        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-[conic-gradient(from_180deg,var(--arc-neon-cyan),var(--arc-neon-purple),var(--arc-neon-magenta),var(--arc-neon-cyan))] opacity-55 blur-lg" />
          <div className="relative flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            <Sparkles className="size-5 text-[var(--arc-neon-cyan)]" />
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Bobbie AI</div>
          <div className="text-[11px] text-white/45">ARC Network · Testnet</div>
        </div>
      </div>

      <div className="grid gap-1">
        <NavItem active={active === "chat"} icon={MessageSquare} label="Chat" onClick={() => onNav("chat")} />
        <NavItem active={active === "portfolio"} icon={LayoutGrid} label="Portfolio" onClick={() => onNav("portfolio")} />
        <NavItem
          active={active === "transactions"}
          icon={Activity}
          label="Transactions"
          onClick={() => onNav("transactions")}
        />
        <NavItem active={active === "bridge"} icon={Waves} label="Bridge" onClick={() => onNav("bridge")} />
        <NavItem active={active === "settings"} icon={Settings2} label="Settings" onClick={() => onNav("settings")} />
      </div>

      <div className="mt-auto space-y-3">
        <div className="arc-ai-glow-border rounded-2xl">
          <div className="arc-ai-glass rounded-2xl p-3">
            <div className="text-[11px] font-medium tracking-wide text-white/45">Quick tools</div>
            <Button
              variant="outline"
              className="mt-2 w-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              onClick={onOpenSwap}
            >
              <ArrowLeftRight className="size-4 text-[var(--arc-neon-cyan)]" />
              Open swap modal
            </Button>
          </div>
        </div>

        {isWalletConnected && wrongChain ? (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] leading-snug text-amber-100">
            <span>Wrong network. </span>
            <button
              type="button"
              className="font-medium text-[var(--arc-neon-cyan)] underline underline-offset-2 hover:text-white"
              onClick={() => void onSwitchToArc()}
            >
              Switch to Arc Testnet
            </button>
          </div>
        ) : null}

        <Button
          onClick={() => void onWalletClick()}
          disabled={walletBusy}
          className={cn(
            "h-11 w-full rounded-xl border border-white/10 bg-gradient-to-r from-[var(--arc-neon-cyan)]/90 to-[var(--arc-neon-purple)]/90 text-black shadow-[0_0_40px_color-mix(in_oklab,var(--arc-neon-cyan)_18%,transparent)] hover:opacity-95 disabled:opacity-60",
          )}
        >
          <Wallet className="size-4" />
          {walletBusy ? "Check wallet…" : isWalletConnected ? "Disconnect" : "Connect wallet"}
        </Button>

        <div className="arc-ai-glass flex items-center gap-3 rounded-2xl p-3">
          <Avatar className="size-10 border border-white/10">
            <AvatarImage src="/placeholder-user.jpg" alt="Profile" />
            <AvatarFallback className="bg-white/5 text-white">
              {isWalletConnected && walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "AN"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Wallet</div>
            <div className="truncate text-[11px] text-white/45">
              {isWalletConnected && walletAddress ? shortHex(walletAddress) : "Not connected"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RightSidebar({
  connected,
  onOpenSwap,
  arcLive,
  arcLiveLoading,
}: {
  connected: boolean
  onOpenSwap: () => void
  arcLive: ArcLiveStatus | null
  arcLiveLoading: boolean
}) {
  const bobbieContract = getBobbieContractAddress()

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="arc-ai-glow-border rounded-2xl">
        <div className="arc-ai-glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium tracking-wide text-white/45">Wallet overview</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                {connected ? "$32,683.44" : "—"}
              </div>
              <div className="mt-1 text-xs text-white/45">{connected ? "Illustrative portfolio" : "Connect to preview"}</div>
            </div>
            <Badge className="rounded-lg border border-white/10 bg-white/[0.04] text-[11px] text-white/70">
              ARC Testnet
            </Badge>
          </div>
          <Separator className="my-4 bg-white/10" />
          <div className="flex items-center justify-between text-xs text-white/55">
            <span>24h change</span>
            <span className="text-[var(--arc-neon-cyan)]">+2.38%</span>
          </div>
        </div>
      </div>

      <div className="arc-ai-glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">Portfolio</div>
          <Button size="sm" variant="ghost" className="h-8 text-white/60 hover:bg-white/5 hover:text-white" onClick={onOpenSwap}>
            Trade
          </Button>
        </div>
        <div className="mt-3">
          <PortfolioChart data={PORTFOLIO_SERIES} />
        </div>
      </div>

      <div className="arc-ai-glass rounded-2xl p-4">
        <div className="text-sm font-semibold tracking-tight">Tokens</div>
        <div className="mt-3 grid gap-2">
          {MOCK_TOKENS.map((t) => (
            <div
              key={t.symbol}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.05]"
            >
              <div>
                <div className="text-sm font-medium">{t.symbol}</div>
                <div className="text-[11px] text-white/45">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{t.balance}</div>
                <div className={cn("text-[11px]", t.up ? "text-[var(--arc-neon-cyan)]" : "text-rose-300/80")}>
                  {t.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="arc-ai-glass rounded-2xl p-4">
        <div className="text-sm font-semibold tracking-tight">Recent transactions</div>
        <div className="mt-3 grid gap-2">
          {MOCK_TXS.map((tx) => (
            <div key={tx.hash} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{tx.type}</div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 rounded-md border px-1.5 text-[10px]",
                      tx.status === "confirmed"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-400/20 bg-amber-400/10 text-amber-200",
                    )}
                  >
                    {tx.status}
                  </Badge>
                </div>
                <div className="truncate text-[11px] text-white/45">{tx.detail}</div>
              </div>
              <div className="shrink-0 text-right text-[11px] text-white/45">{tx.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-1">
        <div className="arc-ai-glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight">Network status</div>
            <span
              className={cn(
                "size-2 rounded-full shadow-[0_0_18px_rgba(52,211,153,0.55)]",
                arcLive?.ok ? "bg-emerald-400" : arcLiveLoading ? "bg-amber-400" : "bg-rose-400/90",
              )}
            />
          </div>
          {arcLiveLoading && !arcLive ? (
            <div className="mt-2 text-xs text-white/45">Connecting to Arc RPC…</div>
          ) : arcLive?.ok ? (
            <>
              <div className="mt-2 text-xs text-white/55">
                {arcLive.name} · chain {arcLive.chainId} · block {arcLive.blockNumber}
              </div>
              <div className="mt-1 text-[11px] text-white/40">
                RPC {arcLive.rpcHost} ·{" "}
                <a
                  href={arcLive.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--arc-neon-cyan)] hover:underline"
                >
                  Arc docs
                </a>
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-amber-200/90">
              {arcLive?.ok === false ? arcLive.message : "No live network data."}
            </div>
          )}
        </div>

        <div className="arc-ai-glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Gauge className="size-4 text-[var(--arc-neon-purple)]" />
            Gas tracker
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {arcLive?.ok ? (
              (["slow", "std", "fast"] as const).map((k) => {
                const val = k === "slow" ? arcLive.gasSlow : k === "std" ? arcLive.gasStd : arcLive.gasFast
                return (
                  <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-white/45">{k}</div>
                    <div className="mt-1 text-sm font-semibold">{val}</div>
                    <div className="text-[10px] text-white/40">{arcLive.gasUnitLabel}</div>
                  </div>
                )
              })
            ) : (
              (["slow", "std", "fast"] as const).map((k) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-white/45">{k}</div>
                  <div className="mt-1 text-sm font-semibold">{GAS_TRACKER[k]}</div>
                  <div className="text-[10px] text-white/40">{GAS_TRACKER.unit}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="arc-ai-glass rounded-2xl p-4">
          <div className="text-sm font-semibold tracking-tight">Bobbie · Contract</div>
          <p className="mt-1 text-[11px] leading-snug text-white/45">
            Arc Testnet address Bobbie links to. Set <span className="font-mono text-white/55">NEXT_PUBLIC_BOBBIE_CONTRACT_ADDRESS</span> to
            override. Deploying/upgrading contracts still requires your wallet or Hardhat <span className="font-mono text-white/55">PRIVATE_KEY</span>{" "}
            locally — a public address alone cannot sign a deployment.
          </p>
          <a
            href={ARC_EXPLORER_ADDRESS(bobbieContract)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-[var(--arc-neon-cyan)] hover:underline"
          >
            {shortHex(bobbieContract)}
            <ExternalLink className="size-3.5 shrink-0 opacity-80" />
          </a>
        </div>

        <div className="arc-ai-glow-border rounded-2xl">
          <div className="arc-ai-glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Cpu className="size-4 text-[var(--arc-neon-cyan)]" />
              AI insights
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{AI_INSIGHT}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PortfolioView() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-white/55">Illustrative balances for ARC Testnet (not wallet reads).</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="arc-ai-glow-border rounded-2xl lg:col-span-2">
          <div className="arc-ai-glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Net worth</div>
              <Badge className="border-white/10 bg-white/[0.04] text-white/70">7D</Badge>
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">$32,683.44</div>
            <div className="mt-4 h-56">
              <PortfolioChart data={PORTFOLIO_SERIES} />
            </div>
          </div>
        </div>
        <div className="arc-ai-glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Allocation</div>
          <div className="mt-4 grid gap-3">
            {[
              { label: "ARC", pct: 56, c: "from-[var(--arc-neon-cyan)] to-[var(--arc-neon-purple)]" },
              { label: "Stablecoins", pct: 28, c: "from-white/40 to-white/10" },
              { label: "BTC / ETH", pct: 16, c: "from-[var(--arc-neon-purple)] to-[var(--arc-neon-magenta)]" },
            ].map((x) => (
              <div key={x.label}>
                <div className="flex items-center justify-between text-xs text-white/55">
                  <span>{x.label}</span>
                  <span>{x.pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full bg-gradient-to-r", x.c)} style={{ width: `${x.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TransactionsView() {
  const { address } = useAccount()
  const explorerHref = address ? ARC_EXPLORER_ADDRESS(address) : "https://testnet.arcscan.app"
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-white/55">
          Sample rows only. Open{" "}
          <a href={explorerHref} target="_blank" rel="noreferrer" className="text-[var(--arc-neon-cyan)] hover:underline">
            ArcScan
          </a>
          {address ? " for your wallet." : " and connect your wallet to track real txs."}
        </p>
      </div>
      <div className="arc-ai-glass overflow-hidden rounded-2xl">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-[11px] font-medium tracking-wide text-white/45">
          <div className="col-span-3">Hash</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-4">Detail</div>
          <div className="col-span-2">Time</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-white/10">
          {MOCK_TXS.map((tx) => (
            <div key={tx.hash} className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.03]">
              <div className="col-span-3 font-mono text-xs text-white/75">{tx.hash}</div>
              <div className="col-span-2 text-white/80">{tx.type}</div>
              <div className="col-span-4 text-white/60">{tx.detail}</div>
              <div className="col-span-2 text-xs text-white/45">{tx.time}</div>
              <div className="col-span-1 text-right">
                <Badge
                  className={cn(
                    "rounded-lg border px-2 text-[10px]",
                    tx.status === "confirmed"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                      : "border-amber-400/20 bg-amber-400/10 text-amber-200",
                  )}
                >
                  {tx.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BridgeView() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bridge</h1>
        <p className="mt-1 text-sm text-white/55">
          No bridge contract is wired in this app yet. Use an official bridge / faucet for Arc Testnet USDC.
        </p>
      </div>
      <div className="arc-ai-glow-border rounded-2xl">
        <div className="arc-ai-glass rounded-2xl p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] font-medium tracking-wide text-white/45">From</div>
              <div className="mt-2 text-lg font-semibold">Ethereum Sepolia</div>
              <div className="mt-1 text-xs text-white/45">Example origin</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] font-medium tracking-wide text-white/45">To</div>
              <div className="mt-2 text-lg font-semibold">ARC Testnet</div>
              <div className="mt-1 text-xs text-white/45">Destination</div>
            </div>
          </div>
          <Separator className="my-6 bg-white/10" />
          <div className="grid gap-3">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Amount</span>
              <span className="text-white">1.25 ETH</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>ETA</span>
              <span className="text-white">~6 minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Fee</span>
              <span className="text-[var(--arc-neon-cyan)]">0.0012 ETH</span>
            </div>
          </div>
          <Button
            type="button"
            disabled
            className="mt-6 h-11 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.06] text-white/50"
          >
            Bridge not connected
          </Button>
        </div>
      </div>
    </div>
  )
}

function SettingsView({
  onRunProgress,
  onOpenConfirm,
}: {
  onRunProgress: () => void
  onOpenConfirm: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-white/55">UI preferences (local only).</p>
      </div>
      <div className="arc-ai-glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Execution previews</div>
            <div className="mt-1 text-xs text-white/45">Optional execution preview before signing in the wallet.</div>
          </div>
          <Switch defaultChecked />
        </div>
        <Separator className="my-5 bg-white/10" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Haptic toasts</div>
            <div className="mt-1 text-xs text-white/45">Toasts when the assistant finishes an action.</div>
          </div>
          <Switch defaultChecked />
        </div>
        <Separator className="my-5 bg-white/10" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" onClick={onOpenConfirm}>
            Open tx confirm modal
          </Button>
          <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/10" onClick={onRunProgress}>
            Run AI progress loader
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ArcAICopilot() {
  const [active, setActive] = useState<NavKey>("chat")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connectAsync, connectors, isPending: connectPending } = useConnect()
  const { disconnectAsync, isPending: disconnectPending } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  const walletBusy = connectPending || disconnectPending
  const wrongChain = isConnected && chainId !== arcTestnet.id

  const governanceAddress = useMemo(() => getGovernanceAddress(), [])
  const publicClient = usePublicClient({ chainId: arcTestnet.id })
  const { writeContractAsync } = useWriteContract()

  const sealGmBurstOnArc = useCallback(async (): Promise<boolean> => {
    if (!isGovernanceConfigured(governanceAddress)) {
      toast.error("Governance contract not configured", {
        description: "Run npm run deploy:arc and refresh, or set NEXT_PUBLIC_ARC_GOVERNANCE_ADDRESS.",
      })
      return false
    }

    let signingAddress = address

    if (!isConnected || !signingAddress) {
      const injected = connectors.find((c) => c.id === "injected" || c.type === "injected")
      const connector = injected ?? connectors[0]
      if (!connector) {
        toast.error("No Web3 wallet found. Install MetaMask (or another wallet) and refresh.")
        return false
      }
      try {
        const session = await connectAsync({ connector, chainId: arcTestnet.id })
        signingAddress = session.accounts[0]
        if (!signingAddress) {
          toast.error("Wallet did not return an address.")
          return false
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed"
        if (!/reject|denied|cancel/i.test(msg)) toast.error(msg)
        return false
      }
    }

    if (switchChainAsync) {
      try {
        await switchChainAsync({ chainId: arcTestnet.id })
      } catch (e) {
        toast.error(formatArcTxError(e))
        return false
      }
    } else if (chainId !== arcTestnet.id) {
      toast.error("This wallet cannot switch networks from the app.")
      return false
    }

    if (!publicClient) {
      toast.error("RPC unavailable. Try again in a moment.")
      return false
    }
    try {
      const hash = await writeContractAsync({
        address: governanceAddress,
        abi: governanceAbi,
        functionName: "emitGmBurst",
        chainId: arcTestnet.id,
        account: signingAddress,
      })
      await publicClient.waitForTransactionReceipt({ hash, chainId: arcTestnet.id })
      toast.success("On-chain transaction confirmed", {
        description: (
          <a href={ARC_EXPLORER_TX(hash)} target="_blank" rel="noreferrer" className="underline">
            ArcScan · {shortHex(hash)}
          </a>
        ),
      })
      void playTxSuccessSound()
      return true
    } catch (e) {
      toast.error(formatArcTxError(e))
      return false
    }
  }, [
    address,
    chainId,
    connectAsync,
    connectors,
    governanceAddress,
    isConnected,
    publicClient,
    switchChainAsync,
    writeContractAsync,
  ])

  const handleWalletClick = useCallback(async () => {
    if (isConnected) {
      try {
        await disconnectAsync()
        toast.success("Wallet disconnected")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not disconnect")
      }
      return
    }
    const injected = connectors.find((c) => c.id === "injected" || c.type === "injected")
    const connector = injected ?? connectors[0]
    if (!connector) {
      toast.error("No Web3 wallet found. Install MetaMask (or another wallet) and refresh.")
      return
    }
    try {
      await connectAsync({ connector, chainId: arcTestnet.id })
      toast.success("Connected to Arc Testnet")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed"
      if (!/reject|denied|cancel/i.test(msg)) toast.error(msg)
    }
  }, [isConnected, disconnectAsync, connectors, connectAsync])

  const handleSwitchToArc = useCallback(async () => {
    if (!switchChainAsync) {
      toast.error("This wallet cannot switch networks from the app.")
      return
    }
    try {
      await switchChainAsync({ chainId: arcTestnet.id })
      toast.success("Network switched to Arc Testnet")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not switch network")
    }
  }, [switchChainAsync])

  const [swapOpen, setSwapOpen] = useState(false)
  const [swapDraft, setSwapDraft] = useState<SwapDraft | null>(null)
  const [txOpen, setTxOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [txPreview, setTxPreview] = useState({
    send: "100 USDC",
    receive: estimateMockReceive("USDC", "ARC", 100),
  })

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const openSwapManual = useCallback(() => {
    setSwapDraft(null)
    setSwapOpen(true)
  }, [])

  const { data: arcLive, loading: arcLiveLoading } = useArcLiveStatus()

  const chatStarted = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
  }, [messages, pending, active])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed }
      setMessages((m) => [...m, user])
      setInput("")
      setPending(true)

      window.setTimeout(() => {
        void (async () => {
          let content: string
          let swapDraftResult: SwapDraft | null = null
          try {
            const r = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: trimmed }),
            })
            if (!r.ok) throw new Error("chat")
            const j = (await r.json()) as ChatApiResponse
            content = j.reply
            swapDraftResult = j.swapDraft
          } catch {
            const local = buildAssistantReply(trimmed)
            content = local.text
            swapDraftResult = local.swapDraft
          }
          const assistant: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content,
          }
          setMessages((m) => [...m, assistant])
          setPending(false)

          if (swapDraftResult) {
            setSwapDraft(swapDraftResult)
            setSwapOpen(true)
          }
        })()
      }, 650)
    },
    [],
  )

  const hero = useMemo(() => {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-10 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60">
            <Bot className="size-3.5 text-[var(--arc-neon-cyan)]" />
            Bobbie AI · Natural language · Arc Testnet · Live signing
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Bobbie AI — your copilot for ARC Network
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-white/55 sm:text-base">
            Describe what you want on-chain. Bobbie AI translates intent into routes, risk checks, and human-readable previews—styled
            like the best AI dashboards, tuned for ARC.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => void handleWalletClick()}
              disabled={walletBusy}
              className="h-11 rounded-xl bg-gradient-to-r from-[var(--arc-neon-cyan)] to-[var(--arc-neon-purple)] px-6 text-black hover:opacity-95 disabled:opacity-60"
            >
              <Wallet className="size-4" />
              Connect wallet
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-6 text-white hover:bg-white/[0.06]"
              onClick={() => {
                setActive("chat")
                send("Show my portfolio")
              }}
            >
              <MessageSquare className="size-4 text-[var(--arc-neon-purple)]" />
              Start chatting
            </Button>
          </div>
        </motion.div>

        <div className="mt-10 w-full">
          <FuturisticHeroArt />
        </div>
      </div>
    )
  }, [handleWalletClick, send, walletBusy])

  return (
    <div className="arc-ai-mesh min-h-svh text-white">
      <div className="flex min-h-svh">
        <aside className="relative hidden w-[272px] shrink-0 border-r border-white/10 lg:block">
          <div className="sticky top-0 h-svh">
            <ScrollArea className="h-full">
              <LeftSidebar
                active={active}
                onNav={(k) => setActive(k)}
                isWalletConnected={isConnected}
                walletAddress={address}
                walletBusy={walletBusy}
                wrongChain={wrongChain}
                onWalletClick={handleWalletClick}
                onSwitchToArc={handleSwitchToArc}
                onOpenSwap={openSwapManual}
              />
            </ScrollArea>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-3 py-3 lg:px-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 lg:hidden">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] border-white/10 bg-[#050508]/95 p-0 text-white backdrop-blur-xl">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>Bobbie AI primary navigation</SheetDescription>
                  </SheetHeader>
                  <LeftSidebar
                    active={active}
                    onNav={(k) => setActive(k)}
                    isWalletConnected={isConnected}
                    walletAddress={address}
                    walletBusy={walletBusy}
                    wrongChain={wrongChain}
                    onWalletClick={handleWalletClick}
                    onSwitchToArc={handleSwitchToArc}
                    onOpenSwap={openSwapManual}
                  />
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
                <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Sparkles className="size-4 text-[var(--arc-neon-cyan)]" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-sm font-semibold">Bobbie AI</div>
                  <div className="truncate text-[11px] text-white/45">Testnet copilot</div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden rounded-xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] md:inline-flex"
                  onClick={openSwapManual}
                >
                  Swap
                </Button>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 lg:hidden">
                      <PanelRight className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[360px] border-white/10 bg-[#050508]/95 p-0 text-white backdrop-blur-xl">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Wallet panel</SheetTitle>
                      <SheetDescription>Balances, gas, and insights</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-svh">
                      <RightSidebar
                        connected={isConnected}
                        onOpenSwap={openSwapManual}
                        arcLive={arcLive}
                        arcLiveLoading={arcLiveLoading}
                      />
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            {active !== "chat" ? (
              <ScrollArea className="min-h-0 flex-1">
                {active === "portfolio" ? <PortfolioView /> : null}
                {active === "transactions" ? <TransactionsView /> : null}
                {active === "bridge" ? <BridgeView /> : null}
                {active === "settings" ? (
                  <SettingsView
                    onRunProgress={() => setProgressOpen(true)}
                    onOpenConfirm={() => {
                      setTxPreview({ send: "100 USDC", receive: estimateMockReceive("USDC", "ARC", 100) })
                      setTxOpen(true)
                    }}
                  />
                ) : null}
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="min-h-0 flex-1">
                  <AnimatePresence mode="popLayout">
                    {!chatStarted ? (
                      <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {hero}
                      </motion.div>
                    ) : (
                      <motion.div key="thread" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-3xl px-4 py-8">
                        <div className="space-y-4">
                          {messages.map((m) => (
                            <motion.div
                              key={m.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-lg",
                                  m.role === "user"
                                    ? "border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] text-white"
                                    : "arc-ai-glow-border border-transparent bg-black/25 text-white/80",
                                )}
                              >
                                <div className="mb-2 flex items-center gap-2 text-[11px] text-white/45">
                                  {m.role === "assistant" ? (
                                    <>
                                      <Bot className="size-3.5 text-[var(--arc-neon-cyan)]" />
                                      Bobbie AI
                                    </>
                                  ) : (
                                    <>
                                      <span className="size-2 rounded-full bg-white/30" />
                                      You
                                    </>
                                  )}
                                </div>
                                <div className="text-[13px] text-white/85">
                                  {m.role === "assistant" ? <TypewriterText text={m.content} /> : m.content}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          {pending ? (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                              <div className="arc-ai-glass rounded-2xl border border-white/10 px-4 py-3">
                                <div className="mb-2 flex items-center gap-2 text-[11px] text-white/45">
                                  <Bot className="size-3.5 text-[var(--arc-neon-cyan)]" />
                                  Bobbie AI
                                </div>
                                <TypingDots />
                              </div>
                            </motion.div>
                          ) : null}
                          <div ref={bottomRef} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ScrollArea>

                <div className="border-t border-white/10 bg-black/25 backdrop-blur-xl">
                  <div className="mx-auto w-full max-w-3xl px-4 py-4">
                    <div className="mb-3 flex flex-wrap justify-center gap-2">
                      {PROMPT_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 transition-all hover:border-[color-mix(in_oklab,var(--arc-neon-cyan)_45%,transparent)] hover:bg-white/[0.06] hover:text-white"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="arc-ai-glow-border rounded-2xl">
                      <div className="arc-ai-glass rounded-2xl p-2">
                        <div className="flex items-end gap-2">
                          <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                send(input)
                              }
                            }}
                            placeholder="Ask Bobbie AI anything about ARC Testnet…"
                            className="min-h-[52px] resize-none border-0 bg-transparent px-3 py-3 text-sm text-white shadow-none outline-none focus-visible:ring-0"
                          />
                          <div className="flex items-center gap-1 pb-1 pr-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "rounded-xl text-white/60 hover:bg-white/10 hover:text-white",
                                voiceOn && "text-[var(--arc-neon-cyan)]",
                              )}
                              onClick={() => {
                                setVoiceOn((v) => !v)
                                toast.message("Voice capture", {
                                  description: voiceOn ? "Mic preview off." : "Mic preview on (no audio stored).",
                                })
                              }}
                              aria-pressed={voiceOn}
                            >
                              <Mic className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              className="rounded-xl bg-gradient-to-br from-[var(--arc-neon-cyan)] to-[var(--arc-neon-purple)] text-black hover:opacity-95"
                              onClick={() => send(input)}
                            >
                              <Send className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center text-[11px] text-white/35">
                      Swap preview is off-chain · “Confirm in wallet” runs a real ArcGovernance.emitGmBurst (USDC gas)
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        <aside className="relative hidden w-[320px] shrink-0 border-l border-white/10 lg:block xl:w-[360px]">
          <div className="sticky top-0 h-svh">
            <ScrollArea className="h-full">
              <RightSidebar
                connected={isConnected}
                onOpenSwap={openSwapManual}
                arcLive={arcLive}
                arcLiveLoading={arcLiveLoading}
              />
            </ScrollArea>
          </div>
        </aside>
      </div>

      <SwapModal
        open={swapOpen}
        draft={swapDraft}
        onOpenChange={(v) => {
          setSwapOpen(v)
          if (!v) setSwapDraft(null)
        }}
        onConfirm={(p) => {
          setTxPreview({ send: `${p.fromAmount} ${p.fromSymbol}`, receive: p.receiveLabel })
          setTxOpen(true)
        }}
      />
      <TransactionConfirmModal
        open={txOpen}
        onOpenChange={setTxOpen}
        sendLabel={txPreview.send}
        receiveLabel={txPreview.receive}
        onAccept={sealGmBurstOnArc}
      />
      <AiExecutionProgressModal open={progressOpen} onOpenChange={setProgressOpen} />
    </div>
  )
}
