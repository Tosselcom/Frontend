"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f3f4f4] backdrop-blur-md border-b border-secondary/15">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo white.svg" alt="FI TRi9i" className="w-28" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-secondary/70 hover:text-secondary transition-colors">Home</Link>
            <Link href="/#about-us" className="text-sm text-secondary/70 hover:text-secondary transition-colors">About us</Link>
            <Link href="/#guide" className="text-sm text-secondary/70 hover:text-secondary transition-colors">Guide</Link>
            <Link href="/#contact" className="text-sm text-secondary/70 hover:text-secondary transition-colors">Contact</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/10 transition-all"
            >
              Sign in
            </Link>
            <span
              className="h-5 w-px bg-secondary/20"
              aria-hidden="true"
            />
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-secondary"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-secondary/10 mt-2 pt-4">
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Home</Link>
              <Link href="/#about-us" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">About us</Link>
              <Link href="/#guide" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Guide</Link>
              <Link href="/#contact" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Contact</Link>
              <div className="flex items-center gap-3 pt-2">
                <Link href="/login" className="flex-1 text-center rounded-lg px-4 py-2.5 text-sm font-medium text-secondary border border-secondary/20 hover:bg-secondary/10 transition-all">Sign in</Link>
                <span className="h-6 w-px bg-secondary/20" aria-hidden="true" />
                <Link href="/signup" className="flex-1 text-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
