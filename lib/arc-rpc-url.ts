import { arcTestnet } from "@/lib/chains/arc-testnet"

/** Server-side RPC (never commit secrets; public RPC only). */
export function getArcTestnetRpcUrl(): string {
  const fromEnv = process.env.ARC_TESTNET_RPC_URL?.trim()
  if (fromEnv) return fromEnv
  return arcTestnet.rpcUrls.default.http[0]
}
