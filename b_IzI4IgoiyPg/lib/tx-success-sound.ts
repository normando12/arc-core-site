/**
 * Plays after each confirmed on-chain transaction (GM burst, vote).
 *
 * Default: `public/sounds/arc audio.mp4` (space in name → URL `/sounds/arc%20audio.mp4`).
 * Override with `NEXT_PUBLIC_TX_SUCCESS_SOUND_URL`, or add fallbacks under `public/sounds/`.
 * If nothing loads, a short built-in chime runs (Web Audio).
 */

const ARC_TX_SOUND_PATH = `/sounds/${encodeURIComponent("arc audio.mp4")}`

function playFallbackChime(): void {
  try {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.22)
  } catch {
    /* no-op */
  }
}

function playAudioUrl(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = new Audio(src)
    el.preload = "auto"
    el.volume = 0.88

    const fail = () => resolve(false)
    el.addEventListener("error", fail, { once: true })

    try {
      const p = el.play()
      if (p !== undefined) {
        void p.then(() => resolve(true)).catch(fail)
      } else {
        resolve(true)
      }
    } catch {
      fail()
    }
  })
}

export async function playTxSuccessSound(): Promise<void> {
  const explicit = process.env.NEXT_PUBLIC_TX_SUCCESS_SOUND_URL?.trim()
  const candidates = [
    explicit,
    ARC_TX_SOUND_PATH,
    "/sounds/tx-success.mp3",
    "/sounds/tx-success.wav",
    "/sounds/tx-success.m4a",
    "/sounds/tx-success.ogg",
  ].filter((u): u is string => Boolean(u))

  for (const src of candidates) {
    if (await playAudioUrl(src)) return
  }
  playFallbackChime()
}
