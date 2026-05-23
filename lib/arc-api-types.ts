import type { SwapDraft } from "@/lib/arc-ai-parse-swap"
import type { WalletCommandKind } from "@/lib/command-parser"

export type ArcLiveStatus =
  | {
      ok: true
      chainId: number
      name: string
      blockNumber: string
      gasSlow: string
      gasStd: string
      gasFast: string
      /** EVM-style gas price units from the node (Arc uses USDC for fees; values are still from eth_gasPrice). */
      gasUnitLabel: string
      rpcHost: string
      docsUrl: string
    }
  | { ok: false; message: string }

export type ChatApiResponse = {
  reply: string
  swapDraft: SwapDraft | null
  walletCommand?: WalletCommandKind | null
  loadingHint?: string | null
}
