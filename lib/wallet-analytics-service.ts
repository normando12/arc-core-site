import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem"

import { arcTestnet } from "@/lib/chains/arc-testnet"
import { getArcTestnetRpcUrl } from "@/lib/arc-rpc-url"
import { calculateGasFees } from "@/lib/gas-fee-calculator"
import {
  buildChatSupportedTokenList,
  resolveTokenSymbolByAddress,
  type ChatSupportedTokenMeta,
} from "@/lib/wallet-token-registry"
import { bobbieSwapAbi, getBobbieSwapAddress, mergePortfolioTokenAddresses } from "@/lib/bobbie-swap"

const ARCSCAN_API = "https://testnet.arcscan.app/api"
const EXPLORER_TIMEOUT_MS = 12_000
const TX_FETCH_LIMIT = 250

export type WalletTransaction = {
  hash: string
  from: string
  to: string
  timestamp: number
  gasUsed: bigint
  gasPrice: bigint
  isError: boolean
  value: bigint
}

export type WalletTokenTransfer = {
  hash: string
  from: string
  to: string
  tokenAddress: string
  symbol: string
  timestamp: number
}

export type TokenUsageSummary = {
  symbol: string
  count: number
  totalInteractions: number
  todayOnly: boolean
  runnersUp: Array<{ symbol: string; count: number }>
}

type BlockscoutTx = {
  hash: string
  from: string
  to: string
  timeStamp: string
  gasUsed: string
  gasPrice: string
  isError: string
  value: string
}

type BlockscoutTokenTx = {
  hash: string
  from: string
  to: string
  contractAddress: string
  tokenSymbol: string
  timeStamp: string
}

type BlockscoutResponse<T> = {
  status: string
  message: string
  result: T
}

function isSameUtcDay(tsSeconds: number, ref = new Date()): boolean {
  const d = new Date(tsSeconds * 1000)
  return (
    d.getUTCFullYear() === ref.getUTCFullYear() &&
    d.getUTCMonth() === ref.getUTCMonth() &&
    d.getUTCDate() === ref.getUTCDate()
  )
}

async function fetchBlockscout<T>(params: Record<string, string>): Promise<T[]> {
  const qs = new URLSearchParams(params)
  const url = `${ARCSCAN_API}?${qs.toString()}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), EXPLORER_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 0 } })
    if (!res.ok) return []
    const body = (await res.json()) as BlockscoutResponse<T[] | string>
    if (body.status !== "1" || !Array.isArray(body.result)) return []
    return body.result
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWalletTransactions(address: Address): Promise<WalletTransaction[]> {
  const rows = await fetchBlockscout<BlockscoutTx>({
    module: "account",
    action: "txlist",
    address,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(TX_FETCH_LIMIT),
    sort: "desc",
  })

  return rows.map((tx) => ({
    hash: tx.hash,
    from: tx.from,
    to: tx.to ?? "",
    timestamp: Number.parseInt(tx.timeStamp, 10) || 0,
    gasUsed: BigInt(tx.gasUsed || "0"),
    gasPrice: BigInt(tx.gasPrice || "0"),
    isError: tx.isError !== "0",
    value: BigInt(tx.value || "0"),
  }))
}

export async function fetchWalletTokenTransfers(address: Address): Promise<WalletTokenTransfer[]> {
  const rows = await fetchBlockscout<BlockscoutTokenTx>({
    module: "account",
    action: "tokentx",
    address,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(TX_FETCH_LIMIT),
    sort: "desc",
  })

  return rows.map((tx) => {
    const mapped = resolveTokenSymbolByAddress(tx.contractAddress)
    const symbol = mapped ?? tx.tokenSymbol?.toUpperCase() ?? "UNKNOWN"
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      tokenAddress: tx.contractAddress.toLowerCase(),
      symbol,
      timestamp: Number.parseInt(tx.timeStamp, 10) || 0,
    }
  })
}

function countTokenInteractions(
  walletAddress: string,
  transfers: WalletTokenTransfer[],
  transactions: WalletTransaction[],
  tokens: ChatSupportedTokenMeta[],
  todayOnly: boolean,
  now: Date,
): Map<string, number> {
  const wallet = walletAddress.toLowerCase()
  const counts = new Map<string, number>()

  const bump = (symbol: string) => {
    if (!symbol || symbol === "UNKNOWN") return
    counts.set(symbol, (counts.get(symbol) ?? 0) + 1)
  }

  for (const tx of transfers) {
    if (todayOnly && !isSameUtcDay(tx.timestamp, now)) continue
    const involved = tx.from.toLowerCase() === wallet || tx.to.toLowerCase() === wallet
    if (!involved) continue
    bump(tx.symbol)
  }

  const usdcAddress = tokens.find((t) => t.symbol === "USDC")?.address?.toLowerCase()
  for (const tx of transactions) {
    if (todayOnly && !isSameUtcDay(tx.timestamp, now)) continue
    if (tx.from.toLowerCase() !== wallet) continue
    if (tx.isError) continue
    if (tx.value > 0n && usdcAddress) bump("USDC")
  }

  return counts
}

export async function getMostUsedTokenToday(
  walletAddress: Address,
  options?: { todayOnly?: boolean; now?: Date },
): Promise<TokenUsageSummary> {
  const todayOnly = options?.todayOnly ?? true
  const now = options?.now ?? new Date()
  const tokens = buildChatSupportedTokenList()

  const [transactions, transfers] = await Promise.all([
    fetchWalletTransactions(walletAddress),
    fetchWalletTokenTransfers(walletAddress),
  ])

  const counts = countTokenInteractions(walletAddress, transfers, transactions, tokens, todayOnly, now)
  const totalInteractions = [...counts.values()].reduce((a, b) => a + b, 0)

  if (counts.size === 0) {
    return { symbol: "—", count: 0, totalInteractions: 0, todayOnly, runnersUp: [] }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const [topSymbol, topCount] = ranked[0]
  const runnersUp = ranked.slice(1, 4).map(([symbol, count]) => ({ symbol, count }))

  return {
    symbol: topSymbol,
    count: topCount,
    totalInteractions,
    todayOnly,
    runnersUp,
  }
}

export async function getDailyGasFees(
  walletAddress: Address,
  options?: { todayOnly?: boolean; now?: Date },
): Promise<ReturnType<typeof calculateGasFees>> {
  const transactions = await fetchWalletTransactions(walletAddress)
  return calculateGasFees(transactions, walletAddress, options)
}

function trimDecimalString(s: string): string {
  if (!s.includes(".")) return s
  return s.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "")
}

export type OnChainBalanceRow = {
  symbol: string
  name: string
  formatted: string
  balance: bigint
  onChain: boolean
}

async function resolveDemoTokenAddresses(client: ReturnType<typeof createPublicClient>): Promise<
  Partial<Record<"ARC" | "ETH" | "WBTC", Address>>
> {
  const swapAddr = getBobbieSwapAddress()
  if (!swapAddr) return {}

  const ZERO = "0x0000000000000000000000000000000000000000" as Address
  const keys = ["arcToken", "ethToken", "wbtcToken"] as const
  const symbols = ["ARC", "ETH", "WBTC"] as const

  const results = await Promise.all(
    keys.map((functionName) =>
      client
        .readContract({
          address: swapAddr,
          abi: bobbieSwapAbi,
          functionName,
        })
        .catch(() => ZERO),
    ),
  )

  const out: Partial<Record<"ARC" | "ETH" | "WBTC", Address>> = {}
  results.forEach((addr, i) => {
    if (typeof addr === "string" && addr !== ZERO) out[symbols[i]] = addr as Address
  })
  return out
}

/** Reads supported chat token balances directly from Arc RPC. */
export async function fetchWalletBalances(walletAddress: Address): Promise<OnChainBalanceRow[]> {
  const client = createPublicClient({
    chain: arcTestnet,
    transport: http(getArcTestnetRpcUrl(), { timeout: 12_000 }),
  })

  const demoAddrs = await resolveDemoTokenAddresses(client)
  const tokens = mergePortfolioTokenAddresses(buildChatSupportedTokenList(), demoAddrs)

  const rows: OnChainBalanceRow[] = []

  for (const meta of tokens) {
    if (!meta.address) {
      rows.push({ symbol: meta.symbol, name: meta.name, formatted: "0", balance: 0n, onChain: false })
      continue
    }

    try {
      const balance = await client.readContract({
        address: meta.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      })
      rows.push({
        symbol: meta.symbol,
        name: meta.name,
        formatted: trimDecimalString(formatUnits(balance, meta.decimals)),
        balance,
        onChain: true,
      })
    } catch {
      rows.push({ symbol: meta.symbol, name: meta.name, formatted: "0", balance: 0n, onChain: false })
    }
  }

  return rows
}
