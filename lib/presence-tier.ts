/** ARC CORE whitepaper tiers — presence score → voting multiplier (display). */

export type PresenceTierId = "base" | "active" | "contributor" | "core"

export type PresenceTier = {
  id: PresenceTierId
  label: string
  rangeLabel: string
  multiplierLabel: string
  minScore: number
  maxScore: number | null
  weightBps: number
}

export const PRESENCE_TIERS: PresenceTier[] = [
  {
    id: "base",
    label: "Base",
    rangeLabel: "0–100",
    multiplierLabel: "1.0×",
    minScore: 0,
    maxScore: 100,
    weightBps: 100,
  },
  {
    id: "active",
    label: "Active",
    rangeLabel: "101–400",
    multiplierLabel: "1.2×",
    minScore: 101,
    maxScore: 400,
    weightBps: 120,
  },
  {
    id: "contributor",
    label: "Contributor",
    rangeLabel: "401–800",
    multiplierLabel: "1.5×",
    minScore: 401,
    maxScore: 800,
    weightBps: 150,
  },
  {
    id: "core",
    label: "Core Member",
    rangeLabel: "801+",
    multiplierLabel: "2.0×",
    minScore: 801,
    maxScore: null,
    weightBps: 200,
  },
]

export function tierForPresenceScore(score: number): PresenceTier {
  const s = Math.max(0, Math.floor(score))
  for (let i = PRESENCE_TIERS.length - 1; i >= 0; i--) {
    const t = PRESENCE_TIERS[i]!
    if (s >= t.minScore) return t
  }
  return PRESENCE_TIERS[0]!
}

/** Same tiers as `ArcGovernance.voteWeight` (basis points: 100 = 1.0×). */
export function voteWeightBpsFromPresenceScore(score: number): number {
  const s = Math.max(0, Math.floor(score))
  if (s <= 100) return 100
  if (s <= 400) return 120
  if (s <= 800) return 150
  return 200
}

/** Progress 0–1 within current tier toward next tier (for UI). */
export function tierProgressWithinBand(score: number): number {
  const s = Math.max(0, Math.floor(score))
  const t = tierForPresenceScore(s)
  const next = PRESENCE_TIERS[PRESENCE_TIERS.indexOf(t) + 1]
  if (!next) return 1
  const span = next.minScore - t.minScore
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, (s - t.minScore) / span))
}
