import type { Address } from "viem"
import {
  arcGovernanceAbi,
  arcGovernanceAddress as generatedAddress,
} from "@/src/constants"

const ZERO = "0x0000000000000000000000000000000000000000" as Address

/** Prefer env override for preview / multi-env; else generated deploy address. */
export function getGovernanceAddress(): Address {
  const env = process.env.NEXT_PUBLIC_ARC_GOVERNANCE_ADDRESS as Address | undefined
  if (env && env !== ZERO) return env
  return generatedAddress as Address
}

export const governanceAbi = arcGovernanceAbi

export function isGovernanceConfigured(addr: Address): boolean {
  return Boolean(addr && addr !== ZERO)
}
