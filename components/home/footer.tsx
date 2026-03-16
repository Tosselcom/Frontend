import Link from "next/link"
import { Linkedin, Facebook, Instagram } from "lucide-react"

const textLinkClass = "text-sm text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"
const socialLinkClass = "text-secondary-foreground/50 hover:text-secondary-foreground transition-colors"

const companyLinks = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/#about-us" },
  { label: "Guide", href: "/#guide" },
]

const legalLinks = ["Privacy Policy", "Terms of Service", "Security"]

const contactLinks = [
  { label: "+213 555-55-55-55", href: "tel:+213555555555" },
  { label: "fi.tri9i@gmail.com", href: "mailto:fi.tri9i@gmail.com" },
]

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2H21.5l-7.12 8.138L22.75 22h-6.56l-5.14-6.73L4.95 22H1.69l7.62-8.71L1.25 2h6.73l4.65 6.17L18.244 2Zm-1.15 18h1.8L6.23 3.9H4.31L17.09 20Z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer id="contact" className="bg-secondary border-t border-secondary-foreground/10 pt-12 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo dark.svg" alt="FI TRi9i" className="w-28" />
            </div>
            <div className="flex w-28 justify-center gap-4">
              <button type="button" className={socialLinkClass} aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </button>
              <button type="button" className={socialLinkClass} aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </button>
              <button type="button" className={socialLinkClass} aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </button>
              <button type="button" className={socialLinkClass} aria-label="X (Twitter)">
                <XIcon />
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={textLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {legalLinks.map((label) => (
                <li key={label}>
                  <button type="button" className={textLinkClass}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary-foreground mb-4">Get in touch</h4>
            <ul className="space-y-2.5">
              {contactLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className={textLinkClass}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-secondary-foreground/10 text-center">
          <p className="text-xs text-secondary-foreground/40">Copyright 2026 &copy; FI TRi9i All Right Reserved.</p>
        </div>
      </div>
    </footer>
  )
}
