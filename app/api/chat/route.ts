import { NextResponse } from "next/server"

import type { ChatApiResponse } from "@/lib/arc-api-types"
import { buildAssistantReply } from "@/lib/bobbie-chat-logic"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let message = ""
  try {
    const body = (await req.json()) as { message?: unknown }
    message = typeof body.message === "string" ? body.message : ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { text, swapDraft } = buildAssistantReply(message)
  const payload: ChatApiResponse = { reply: text, swapDraft }
  return NextResponse.json(payload)
}
