"use client"

import { useCallback, useEffect, useState } from "react"

import type { ArcLiveStatus } from "@/lib/arc-api-types"

export function useArcLiveStatus(pollMs = 25_000) {
  const [data, setData] = useState<ArcLiveStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/arc/status", { cache: "no-store" })
      const json = (await res.json()) as ArcLiveStatus
      setData(json)
    } catch {
      setData({ ok: false, message: "Could not reach /api/arc/status" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), pollMs)
    return () => window.clearInterval(id)
  }, [refresh, pollMs])

  return { data, loading, refresh }
}
