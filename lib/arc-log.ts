/** Industrial-minimal Arc-style diagnostics for console + UI. */

export function arcLog(code: string, detail?: string) {
  const line = detail ? `[${code}] ${detail}` : `[${code}]`
  if (process.env.NODE_ENV === "development") {
    console.info(line)
  }
}

export function arcErr(code: string, detail?: string) {
  const line = detail ? `[${code}] ${detail}` : `[${code}]`
  console.warn(line)
}

export function shortHex(addr: string, left = 6, right = 4) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}
