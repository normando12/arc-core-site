import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { Web3Provider } from '@/components/web3-provider'
import './globals.css'

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-arc-ai-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-arc-ai-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bobbie AI — ARC Network Testnet Copilot',
  description:
    'Bobbie AI: a futuristic copilot UI for exploring ARC Network Testnet with natural language. Mock data, production-grade frontend.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body
        className={`${sans.className} antialiased bg-[#020204] text-white [--font-sans:var(--font-arc-ai-sans)] [--font-mono:var(--font-arc-ai-mono)]`}
      >
        <Web3Provider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              className:
                'border border-white/10 bg-[#0a0a10]/95 text-[13px] text-white/90 shadow-[0_0_40px_color-mix(in_oklab,#22f6ff_12%,transparent)] backdrop-blur-xl',
            }}
          />
        </Web3Provider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
