"use client"

import { motion } from "framer-motion"

export function FuturisticHeroArt() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto aspect-[4/3] w-full max-w-[520px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--arc-neon-cyan)_35%,transparent),transparent_55%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_78%_30%,color-mix(in_oklab,var(--arc-neon-purple)_40%,transparent),transparent_50%)] blur-2xl" />
      <svg viewBox="0 0 520 420" className="relative h-full w-full drop-shadow-[0_0_40px_color-mix(in_oklab,var(--arc-neon-cyan)_25%,transparent)]">
        <defs>
          <linearGradient id="arcOrb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22f6ff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#a855f7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="arcRing" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22f6ff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#22f6ff" stopOpacity="0.15" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "260px 210px" }}
        >
          <circle cx="260" cy="210" r="168" fill="none" stroke="url(#arcRing)" strokeWidth="2" opacity="0.55" />
        </motion.g>
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "260px 210px" }}
        >
          <circle cx="260" cy="210" r="132" fill="none" stroke="url(#arcRing)" strokeWidth="1.25" opacity="0.35" />
        </motion.g>
        <circle cx="260" cy="210" r="92" fill="url(#arcOrb)" opacity="0.22" filter="url(#glow)" />
        <circle cx="260" cy="210" r="74" fill="url(#arcOrb)" opacity="0.55" filter="url(#glow)" />
        <path
          d="M260 136c41 0 74 33 74 74s-33 74-74 74-74-33-74-74 33-74 74-74Z"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1"
          opacity="0.35"
        />
        <g opacity="0.9">
          <path
            d="M232 210c0-15 12-27 28-27 9 0 17 4 22 11l-14 8c-2-3-6-5-10-5-8 0-14 6-14 13s6 13 14 13c6 0 11-3 13-8h-13v-16h32v8c0 20-16 36-36 36-20 0-36-16-36-36Z"
            fill="white"
            opacity="0.9"
          />
        </g>
        <motion.path
          d="M120 320c40-30 88-46 140-46s100 16 140 46"
          fill="none"
          stroke="url(#arcRing)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.55 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </motion.div>
  )
}
