import type { Address } from "viem"

/** Default Bobbie on-chain reference on Arc Testnet (public; override via env). */
const DEFAULT_BOBBIE_CONTRACT: Address = "0x8Ce26Ce6E76301728f004bBA5706CC3e8B95cd2D"

/**
 * Bobbie UI / links — not used for signing. Override for your deployment:
 * `NEXT_PUBLIC_BOBBIE_CONTRACT_ADDRESS=0x...`
 */
export function getBobbieContractAddress(): Address {
  const raw = process.env.NEXT_PUBLIC_BOBBIE_CONTRACT_ADDRESS?.trim()
  if (raw?.startsWith("0x") && raw.length === 42) return raw as Address
  return DEFAULT_BOBBIE_CONTRACT
}
