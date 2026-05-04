import { createConfig, http, type CreateConnectorFn } from "wagmi"
import { injected, walletConnect } from "wagmi/connectors"
import { arcTestnet } from "@/lib/chains/arc-testnet"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

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
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  /** Evita hidratação incompleta (página em branco) sem cookie SSR do Wagmi. */
  ssr: false,
})
