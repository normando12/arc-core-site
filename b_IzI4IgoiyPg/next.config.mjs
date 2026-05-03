/** Hostnames extras no dev (ex.: IP da LAN). Ver .env.example — NEXT_ALLOWED_DEV_ORIGINS */
const extraDevHosts =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Esconde o botão “N” / menu do Next em `next dev` — não aparece em produção. */
  devIndicators: false,
  ...(extraDevHosts.length > 0 ? { allowedDevOrigins: extraDevHosts } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
