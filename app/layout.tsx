import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'FI TRI9I',
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
