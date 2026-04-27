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
            <Link href="/" className="relative text-sm text-secondary/70 hover:text-secondary transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:origin-center after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:after:scale-x-100">Home</Link>
            <Link href="/#about-us" className="relative text-sm text-secondary/70 hover:text-secondary transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:origin-center after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:after:scale-x-100">About us</Link>
            <Link href="/#guide" className="relative text-sm text-secondary/70 hover:text-secondary transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:origin-center after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:after:scale-x-100">Guide</Link>
            <Link href="/#contact" className="relative text-sm text-secondary/70 hover:text-secondary transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:origin-center after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:after:scale-x-100">Contact</Link>
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
              <Link onClick={() => setIsOpen(false)} href="/" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Home</Link>
              <Link onClick={() => setIsOpen(false)} href="/#about-us" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">About us</Link>
              <Link onClick={() => setIsOpen(false)} href="/#guide" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Guide</Link>
              <Link onClick={() => setIsOpen(false)} href="/#contact" className="text-sm text-secondary/70 hover:text-secondary px-2 py-1.5 transition-colors">Contact</Link>
              <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                <Link onClick={() => setIsOpen(false)} href="/login" className="text-center rounded-lg px-4 py-2.5 text-sm font-medium text-secondary border border-secondary/20 hover:bg-secondary/10 transition-all">Sign in</Link>
                <Link onClick={() => setIsOpen(false)} href="/signup" className="text-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
