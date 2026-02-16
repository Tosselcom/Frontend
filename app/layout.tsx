import { Outfit } from 'next/font/google'
import './globals.css'
import { Icon } from 'lucide-react'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata = {
  title: '100%TOSSELCOM',
  icon: '/body-logo.ico',
  description: 'A multi-sided digital delivery platform connecting shippers, truckers, and couriers for efficient freight transport.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
