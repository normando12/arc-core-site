import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { Web3Provider } from '@/components/web3-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArC Core - Governance',
  description: 'Interact with the Arc ecosystem through Proof of Presence and decentralized governance.',
  /** Icons: `app/favicon.ico` + `app/apple-icon.png` (Arc logo) — file-based so dev server does not fall back to the Next “N”. */
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#0a1628]">
      <body className="font-sans antialiased bg-[#0a1628] text-white">
        <Web3Provider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              className:
                "font-mono text-[11px] tracking-wide border border-white/10 bg-[#0d1a2d] text-white/90",
            }}
          />
        </Web3Provider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
