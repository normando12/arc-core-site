"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Bot, Gauge, Wallet } from "lucide-react"

import type { WalletCommandKind } from "@/lib/command-parser"
import { walletCommandIconKind, walletCommandLoadingLabel } from "@/lib/command-parser"
import { cn } from "@/lib/utils"

function LoadingIcon({ kind }: { kind: WalletCommandKind }) {
  const iconKind = walletCommandIconKind(kind)
  const Icon = iconKind === "analytics" ? Activity : iconKind === "gas" ? Gauge : Wallet
  const color =
    iconKind === "analytics"
      ? "text-[var(--arc-neon-purple)]"
      : iconKind === "gas"
        ? "text-[var(--arc-neon-magenta)]"
        : "text-[var(--arc-neon-cyan)]"

  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className={cn("flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]", color)}
    >
      <Icon className="size-4" />
    </motion.div>
  )
}

function TypingDots() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.2, repeat: Infinity }}
      className="flex items-center gap-1.5"
      aria-hidden
    >
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-cyan)]/80" />
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-purple)]/80" />
      <span className="arc-ai-typing-dot size-2 rounded-full bg-[var(--arc-neon-magenta)]/70" />
    </motion.div>
  )
}

export function WalletChatLoading({
  commandKind,
  hint,
}: {
  commandKind?: WalletCommandKind | null
  hint?: string | null
}) {
  const label = hint ?? (commandKind ? walletCommandLoadingLabel(commandKind) : "Bobbie AI está pensando…")

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <motion.div
        animate={{ boxShadow: ["0 0 0 0 rgba(0,0,0,0)", "0 0 24px 0 color-mix(in oklab, var(--arc-neon-cyan) 12%, transparent)", "0 0 0 0 rgba(0,0,0,0)"] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        className="arc-ai-glass max-w-[92%] rounded-2xl border border-white/10 px-4 py-3"
      >
        <motion.div
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="mb-2 flex items-center gap-2 text-[11px] text-white/45"
        >
          <Bot className="size-3.5 text-[var(--arc-neon-cyan)]" />
          Bobbie AI
        </motion.div>
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-3"
        >
          {commandKind ? <LoadingIcon kind={commandKind} /> : null}
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity }} className="min-w-0 flex-1">
            <motion.div animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 1.3, repeat: Infinity }} className="text-[13px] text-white/80">
              {label}
            </motion.div>
            <div className="mt-2">
              <TypingDots />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function AssistantMessageBody({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap">
      <TypewriterInline text={text} />
    </motion.div>
  )
}

function TypewriterInline({ text }: { text: string }) {
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
