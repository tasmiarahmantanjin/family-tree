import { FC, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { Source_Serif_4, DM_Sans } from 'next/font/google'
import AuthGate from '@/components/auth/AuthGate'
import AuthProvider from '@/providers/AuthProvider'
import QueryProvider from '@/providers/QueryProvider'
import './globals.css'

const sourceSerif = Source_Serif_4({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
})

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Family Tree Builder',
  description: 'A mini family tree builder application',
}

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout: FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en">
      <body className={`${sourceSerif.variable} ${dmSans.variable} antialiased`}>
        <AuthProvider>
          <QueryProvider>
            <AuthGate>{children}</AuthGate>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

export default RootLayout
