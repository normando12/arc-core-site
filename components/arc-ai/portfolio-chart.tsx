"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PORTFOLIO_SERIES } from "@/lib/arc-ai-mock-data"

type Row = (typeof PORTFOLIO_SERIES)[number]

export function PortfolioChart({ data }: { data: readonly Row[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="arcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22f6ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="arcStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22f6ff" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="color-mix(in oklab, white 10%, transparent)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "color-mix(in oklab, white 45%, transparent)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "color-mix(in oklab, white 35%, transparent)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 0.6", "dataMax + 0.6"]}
          />
          <Tooltip
            cursor={{ stroke: "color-mix(in oklab, white 18%, transparent)" }}
            contentStyle={{
              background: "color-mix(in oklab, black 55%, transparent)",
              border: "1px solid color-mix(in oklab, white 14%, transparent)",
              borderRadius: 12,
              color: "white",
              fontSize: 12,
              backdropFilter: "blur(12px)",
            }}
            labelStyle={{ color: "color-mix(in oklab, white 70%, transparent)" }}
            formatter={(value: number) => [`$${value.toFixed(2)}k`, "Net worth"]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="url(#arcStroke)"
            strokeWidth={2}
            fill="url(#arcFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: "#22f6ff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
