import { NextResponse } from "next/server"
import { createPublicClient, formatGwei, http } from "viem"

import { ARC_CHAIN_DOCS_URL } from "@/lib/arc-docs"
import type { ArcLiveStatus } from "@/lib/arc-api-types"
import { arcTestnet } from "@/lib/chains/arc-testnet"
import { getArcTestnetRpcUrl } from "@/lib/arc-rpc-url"

export const dynamic = "force-dynamic"

function hostOnly(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "unknown"
  }
}

export async function GET() {
  const rpcUrl = getArcTestnetRpcUrl()
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl, { timeout: 12_000 }),
  })

  try {
    const [id, blockNumber, gasPrice] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      client.getGasPrice(),
    ])

    if (id !== arcTestnet.id) {
      const body: ArcLiveStatus = {
        ok: false,
        message: `Unexpected chain id ${id} (expected ${arcTestnet.id}).`,
      }
      return NextResponse.json(body, { status: 502 })
    }

    const slow = (gasPrice * 85n) / 100n
    const fast = (gasPrice * 115n) / 100n
    const fmt = (g: bigint) => Number(formatGwei(g)).toFixed(4)

    const body: ArcLiveStatus = {
      ok: true,
      chainId: id,
      name: arcTestnet.name,
      blockNumber: blockNumber.toString(),
      gasSlow: fmt(slow),
      gasStd: fmt(gasPrice),
      gasFast: fmt(fast),
      gasUnitLabel: "gwei (RPC)",
      rpcHost: hostOnly(rpcUrl),
      docsUrl: ARC_CHAIN_DOCS_URL,
    }
    return NextResponse.json(body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RPC error"
    const body: ArcLiveStatus = { ok: false, message: msg }
    return NextResponse.json(body, { status: 503 })
  }
}
