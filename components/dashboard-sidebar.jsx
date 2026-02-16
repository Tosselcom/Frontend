"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Truck,
  LayoutDashboard,
  Package,
  Route,
  MapPin,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  PlusCircle,
  History,
} from "lucide-react"

const shipperLinks = [
  { href: "/dashboard/shipper", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/shipper/shipments", label: "My Shipments", icon: Package },
  { href: "/dashboard/shipper/create-shipment", label: "Create Shipment", icon: PlusCircle },
  { href: "/dashboard/shipper/tracking", label: "Track Shipments", icon: MapPin },
  { href: "/dashboard/shipper/history", label: "History", icon: History },
  { href: "/dashboard/shipper/analytics", label: "Analytics", icon: BarChart3 },
]

const truckerLinks = [
  { href: "/dashboard/trucker", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/trucker/routes", label: "My Routes", icon: Route },
  { href: "/dashboard/trucker/create-route", label: "Post Route", icon: PlusCircle },
  { href: "/dashboard/trucker/loads", label: "Available Loads", icon: Package },
  { href: "/dashboard/trucker/tracking", label: "Live Tracking", icon: MapPin },
  { href: "/dashboard/trucker/history", label: "History", icon: History },
  { href: "/dashboard/trucker/analytics", label: "Analytics", icon: BarChart3 },
]

const bottomLinks = [
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default function DashboardSidebar({ role = "shipper" }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const links = role === "trucker" ? truckerLinks : shipperLinks

  const isActive = (href) => pathname === href

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-secondary px-4 h-14 border-b border-secondary-foreground/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-secondary-foreground">TOSSELCOM</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-secondary-foreground" aria-label="Toggle sidebar">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/50" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-secondary flex flex-col transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-secondary-foreground/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-bold text-secondary-foreground block leading-tight">TOSSELCOM</span>
            <span className="text-[10px] text-secondary-foreground/50 uppercase tracking-wider">{role} Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold text-secondary-foreground/40 uppercase tracking-wider mb-2">Main</p>
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary-foreground/70 hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
                  }`}
                >
                  <link.icon className="w-5 h-5 flex-shrink-0" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-4 h-px bg-secondary-foreground/10" />

          <p className="px-3 text-[10px] font-semibold text-secondary-foreground/40 uppercase tracking-wider mb-2">Account</p>
          <ul className="space-y-1">
            {bottomLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary-foreground/70 hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
                  }`}
                >
                  <link.icon className="w-5 h-5 flex-shrink-0" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-3 py-4 border-t border-secondary-foreground/10">
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary-foreground/70 hover:bg-secondary-foreground/5 hover:text-secondary-foreground transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Link>
        </div>
      </aside>
    </>
  )
}
