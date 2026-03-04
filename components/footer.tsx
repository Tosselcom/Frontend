import Link from "next/link"
import { Linkedin, Facebook, Instagram } from "lucide-react"
import logo from "../public/Logo-dark.svg"

export default function Footer() {
  return (
    <footer id="contact" className="bg-secondary border-t border-secondary-foreground/10 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={logo.src} alt="Tosselcom" className="w-28" />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/#about-us"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  href="/#guide"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  Security
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Get in touch</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="tel:+213XXXXXXXXX"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  +213 555-55-55-55
                </a>
              </li>
              <li>
                <a
                  href="mailto:contact@tosselcom.com"
                  className="text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
                >
                  contact@tosselcom.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-secondary-foreground/10 text-center">
          <p className="text-xs text-secondary-foreground/40">Copyright 2026 &copy; Tosselcom All Right Reserved.</p>
        </div>
      </div>
    </footer>
  )
}
