"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownUp, Cpu, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { estimateMockReceive, SWAP_SYMBOLS, type SwapDraft, type SwapSymbol } from "@/lib/arc-ai-parse-swap"
import { cn } from "@/lib/utils"

const DEFAULT_DRAFT: SwapDraft = {
  fromSymbol: "USDC",
  toSymbol: "ARC",
  fromAmount: "100",
}

export type SwapConfirmPayload = {
  fromSymbol: SwapSymbol
  toSymbol: SwapSymbol
  fromAmount: string
  receiveLabel: string
}

export function SwapModal({
  open,
  onOpenChange,
  draft,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** When null, uses USDC → ARC and 100 */
  draft: SwapDraft | null
  onConfirm: (payload: SwapConfirmPayload) => void
}) {
  const [from, setFrom] = useState<SwapSymbol>(DEFAULT_DRAFT.fromSymbol)
  const [to, setTo] = useState<SwapSymbol>(DEFAULT_DRAFT.toSymbol)
  const [amount, setAmount] = useState(DEFAULT_DRAFT.fromAmount)

  useEffect(() => {
    if (!open) return
    const d = draft ?? DEFAULT_DRAFT
    setFrom(d.fromSymbol)
    setTo(d.toSymbol)
    setAmount(d.fromAmount)
  }, [open, draft])

  const receive = useMemo(() => {
    const n = Number.parseFloat(amount.replace(",", "."))
    if (!Number.isFinite(n) || n <= 0) return "—"
    return estimateMockReceive(from, to, n)
  }, [amount, from, to])

  const routeText = `${from} → ${from}/${to} pool → ${to}`

  const onFromChange = (v: SwapSymbol) => {
    setFrom(v)
    if (v === to) setTo(SWAP_SYMBOLS.find((s) => s !== v) ?? "ARC")
  }

  const onToChange = (v: SwapSymbol) => {
    setTo(v)
    if (v === from) setFrom(SWAP_SYMBOLS.find((s) => s !== v) ?? "USDC")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          "border-white/10 bg-[#07070a]/95 text-white shadow-[0_0_80px_color-mix(in_oklab,var(--arc-neon-cyan)_12%,transparent)] backdrop-blur-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base tracking-tight">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <ArrowDownUp className="size-4 text-[var(--arc-neon-cyan)]" />
            </span>
            Swap tokens (preview)
          </DialogTitle>
          <DialogDescription className="text-white/55">
            Route and amounts are estimates only. When you confirm the next step, your wallet signs a real{" "}
            <span className="text-white/75">ArcGovernance.emitGmBurst</span> on Arc Testnet (Proof of Presence — USDC gas).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label className="text-white/60">From</Label>
            <div className="flex gap-2">
              <Select value={from} onValueChange={(v) => onFromChange(v as SwapSymbol)}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0b0b10] text-white">
                  {SWAP_SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="border-white/10 bg-white/5 text-right text-white"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-white/60">To</Label>
            <div className="flex gap-2">
              <Select value={to} onValueChange={(v) => onToChange(v as SwapSymbol)}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0b0b10] text-white">
                  {SWAP_SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                readOnly
                value={receive === "—" ? "—" : `≈ ${receive}`}
                className="border-white/10 bg-white/[0.03] text-right text-white/80"
              />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
            Route: {routeText} · Slippage 0.5% · Est. gas{" "}
            <span className="text-[var(--arc-neon-cyan)]">0.0021 ARC</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={receive === "—"}
            className="bg-gradient-to-r from-[var(--arc-neon-cyan)] to-[var(--arc-neon-purple)] text-black hover:opacity-95 disabled:opacity-40"
            onClick={() => {
              const amt = amount.replace(",", ".")
              onConfirm({
                fromSymbol: from,
                toSymbol: to,
                fromAmount: amt,
                receiveLabel: receive,
              })
              onOpenChange(false)
            }}
          >
            Review transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransactionConfirmModal({
  open,
  onOpenChange,
  onAccept,
  sendLabel,
  receiveLabel,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Return true to close the modal (e.g. tx submitted and mined). */
  onAccept: () => Promise<boolean>
  sendLabel: string
  receiveLabel: string
}) {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) setPending(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          "border-white/10 bg-[#07070a]/95 text-white backdrop-blur-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base tracking-tight">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <ShieldCheck className="size-4 text-[var(--arc-neon-purple)]" />
            </span>
            Confirm transaction
          </DialogTitle>
          <DialogDescription className="text-white/55">
            Your wallet will broadcast <span className="text-white/75">emitGmBurst</span> on ArcGovernance (real Arc Testnet
            transaction, USDC gas). Swap lines above are a preview, not a DEX trade.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <div className="flex items-center justify-between text-white/60">
            <span>Preview</span>
            <span className="text-white">Swap intent</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/60">
            <span>Send</span>
            <span className="text-white">{sendLabel}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/60">
            <span>Receive (est.)</span>
            <span className="text-[var(--arc-neon-cyan)]">{receiveLabel}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/60">
            <span>On-chain call</span>
            <span className="text-right text-xs text-white">emitGmBurst()</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-white/60">
            <span>Network</span>
            <span className="text-white">Arc Testnet</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-white/10 bg-transparent text-white hover:bg-white/10"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Reject
          </Button>
          <Button
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              void (async () => {
                setPending(true)
                try {
                  const ok = await onAccept()
                  if (ok) onOpenChange(false)
                } finally {
                  setPending(false)
                }
              })()
            }}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                Waiting for wallet…
              </>
            ) : (
              "Confirm in wallet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AiExecutionProgressModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [value, setValue] = useState(12)

  useEffect(() => {
    if (!open) {
      setValue(12)
      return
    }
    const t = window.setInterval(() => {
      setValue((v) => {
        const n = v + Math.max(2, Math.round(Math.random() * 9))
        return n >= 100 ? 100 : n
      })
    }, 220)
    return () => window.clearInterval(t)
  }, [open])

  useEffect(() => {
    if (!open || value < 100) return
    const done = window.setTimeout(() => {
      onOpenChange(false)
      toast.message("Preview animation ended", {
        description:
          "That progress bar was UI-only (no chain execution). To broadcast on-chain, confirm in your wallet from the transaction modal.",
      })
    }, 520)
    return () => window.clearTimeout(done)
  }, [open, value, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-md",
          "border-white/10 bg-[#07070a]/95 text-white backdrop-blur-xl",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base tracking-tight">
            <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Cpu className="size-4 text-[var(--arc-neon-cyan)]" />
            </span>
            AI execution in progress
          </DialogTitle>
          <DialogDescription className="text-white/55">
            Demo animation only — does not broadcast a transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Progress
            value={value}
            className="h-2 bg-white/10 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#22f6ff] [&>[data-slot=progress-indicator]]:to-[#a855f7]"
          />
          <ol className="space-y-2 text-sm text-white/70">
            <li className={cn(value > 15 && "text-white")}>1. Parsing natural language intent</li>
            <li className={cn(value > 45 && "text-white")}>2. Selecting optimal ARC pool route</li>
            <li className={cn(value > 78 && "text-white")}>3. Building calldata + gas envelope</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  )
}
