import { defineChain } from "viem"

/** Arc Testnet — see https://docs.arc.network/integrate/connect-to-arc */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: {
      name: "ArcScan Testnet",
      url: "https://testnet.arcscan.app",
    },
  },
})

export const ARC_EXPLORER_TX = (hash: string) =>
  `https://testnet.arcscan.app/tx/${hash}`
