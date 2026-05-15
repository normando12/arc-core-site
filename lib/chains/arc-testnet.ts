import { defineChain } from "viem"

/** Arc Testnet — chain id 5042002, USDC gas, EVM. See https://docs.arc.io/arc-chain */
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

export const ARC_EXPLORER_ADDRESS = (address: string) =>
  `https://testnet.arcscan.app/address/${address}`
