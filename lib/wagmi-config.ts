import { createConfig, http, type CreateConnectorFn } from "wagmi"
import { injected, walletConnect } from "wagmi/connectors"
import { arcTestnet } from "@/lib/chains/arc-testnet"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const arcRpc =
  typeof process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL === "string" && process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL.trim()
    ? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL.trim()
    : arcTestnet.rpcUrls.default.http[0]

const connectors = [
  injected({ shimDisconnect: true }),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          showQrModal: true,
        }),
      ]
    : []),
] as CreateConnectorFn[]

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors,
  transports: {
    [arcTestnet.id]: http(arcRpc),
  },
  /** Evita hidratação incompleta (página em branco) sem cookie SSR do Wagmi. */
  ssr: false,
})
