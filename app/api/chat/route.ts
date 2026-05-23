import { NextResponse } from "next/server"

import type { ChatApiResponse } from "@/lib/arc-api-types"
import { buildAssistantReplyAsync } from "@/lib/bobbie-chat-logic"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let message = ""
  let walletAddress: string | undefined
  let chainId: number | undefined

  try {
    const body = (await req.json()) as {
      message?: unknown
      walletAddress?: unknown
      chainId?: unknown
    }
    message = typeof body.message === "string" ? body.message : ""
    walletAddress = typeof body.walletAddress === "string" ? body.walletAddress : undefined
    chainId = typeof body.chainId === "number" ? body.chainId : undefined
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { text, swapDraft, walletCommand, loadingHint } = await buildAssistantReplyAsync(message, {
    walletAddress,
    chainId,
  })

  const payload: ChatApiResponse = {
    reply: text,
    swapDraft,
    walletCommand: walletCommand ?? null,
    loadingHint: loadingHint ?? null,
  }
  return NextResponse.json(payload)
}
