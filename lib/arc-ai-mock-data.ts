export type NavKey = "chat" | "portfolio" | "transactions" | "bridge" | "settings"

export const PROMPT_SUGGESTIONS = [
  "Qual token mais usei hoje?",
  "Quanto gastei em taxas?",
  "Meu saldo total",
  "Swap 100 USDC to ARC",
  "Bridge assets to ARC Testnet",
] as const

export const MOCK_TOKENS = [
  { symbol: "ARC", name: "Arc Network", balance: "12,842.05", usd: "$18,420.12", change: "+4.2%", up: true },
  { symbol: "USDC", name: "USD Coin", balance: "4,250.00", usd: "$4,250.00", change: "+0.01%", up: true },
  { symbol: "ETH", name: "Ether", balance: "2.18", usd: "$6,902.44", change: "-1.3%", up: false },
  { symbol: "wBTC", name: "Wrapped BTC", balance: "0.042", usd: "$3,110.88", change: "+0.6%", up: true },
] as const

export const MOCK_TXS = [
  { hash: "0x9f2a…c41d", type: "Swap", detail: "USDC → ARC", time: "2m ago", status: "confirmed" as const },
  { hash: "0x3b81…91aa", type: "Bridge", detail: "ETH → ARC", time: "18m ago", status: "confirmed" as const },
  { hash: "0x71ce…08b2", type: "Stake", detail: "ARC Validator", time: "1h ago", status: "confirmed" as const },
  { hash: "0x44d0…7f01", type: "Approve", detail: "USDC Router", time: "3h ago", status: "pending" as const },
] as const

export const PORTFOLIO_SERIES = [
  { t: "Mon", v: 22.4 },
  { t: "Tue", v: 23.1 },
  { t: "Wed", v: 22.7 },
  { t: "Thu", v: 24.8 },
  { t: "Fri", v: 25.9 },
  { t: "Sat", v: 26.4 },
  { t: "Sun", v: 27.2 },
] as const

export const GAS_TRACKER = { slow: "0.42", std: "0.58", fast: "0.74", unit: "gwei" } as const

export const AI_INSIGHT =
  "Liquidity on ARC/USDC pools tightened by 6% in the last 24h. Consider splitting size if swapping > $25k."

export const MOCK_ADDRESS = "0x71C…9A08"
