import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Map,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
} from 'lucide-react'

export default function DashboardSidebar({
  uiLanguage = 'English',
  hasUnreadNotifications = false,
  notificationsCount = 0,
  onOpenNotifications,
}) {
  const tr = (en, fr) => {
    if (uiLanguage === 'French') return fr
    return en
  }

  const router = useRouter()
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'overview'
      setActiveSection(hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const unifiedMenuItems = [
    {
      icon: LayoutDashboard,
      label: tr('Overview', 'Vue'),
      href: '#overview',
    },
    {
      icon: Package,
      label: tr('Delivery Posts', 'Livraisons'),
      href: '#shipments',
    },
    {
      icon: Map,
      label: tr('Availability Posts', 'Disponibilites'),
      href: '#routes',
    },
    {
      icon: Zap,
      label: tr('Invitations & Match', 'Invitations'),
      href: '#matching',
    },
    {
      icon: BarChart3,
      label: tr('Analytics', 'Stats'),
      href: '#analytics',
    },
  ]
  const menuItems = unifiedMenuItems

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    router.push('/login')
  }

  const isActive = (href) => {
    const sectionName = href.substring(1)
    return activeSection === sectionName
  }

  return (
    <div className="h-full flex flex-col">
      {/* Logo Section */}
      <div className="px-4 sm:px-5 py-4 sm:py-6 border-b border-border/20">
        <div className="mb-4 sm:mb-6">
          <Image
            src="/logo dark.svg"
            alt="Tosselcom Logo"
            width={160}
            height={64}
            className="h-10 sm:h-16 w-auto object-contain"
            priority
          />
        </div>

        
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all group font-medium text-[13px] sm:text-sm ${
              isActive(item.href)
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-secondary-foreground/80 hover:bg-secondary-foreground/10 hover:text-secondary-foreground'
            }`}
          >
            <item.icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors ${isActive(item.href) ? 'text-primary-foreground' : 'group-hover:text-primary'}`} />
            <span className="group-hover:translate-x-1 transition-transform flex-1 whitespace-nowrap truncate">{item.label}</span>
            {isActive(item.href) && <ChevronRight className="w-4 h-4" />}
          </a>
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-border/30 mx-4 sm:mx-5" />

      {/* Quick Actions */}
      <div className="px-3 sm:px-4 py-3 sm:py-4.5">
        <a
          href="#notifications"
          onClick={onOpenNotifications}
          className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 rounded-lg transition-all text-[13px] sm:text-sm font-medium relative group ${
            isActive('#notifications')
              ? 'bg-primary text-primary-foreground'
              : 'text-secondary-foreground/80 hover:bg-secondary-foreground/10 hover:text-secondary-foreground'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>{tr('Notifications', 'Notifications')}</span>
          {hasUnreadNotifications && notificationsCount > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse group-hover:animate-pulse" />
          )}
        </a>
        <a
          href="#settings"
          className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 rounded-lg transition-all text-[13px] sm:text-sm font-medium ${
            isActive('#settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-secondary-foreground/80 hover:bg-secondary-foreground/10 hover:text-secondary-foreground'
          }`}
        >
          <Settings className="w-5 h-5" />
          {tr('Settings', 'Reglages')}
        </a>
      </div>

      {/* Logout Button */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 text-red-600 hover:bg-red-50/20 dark:hover:bg-red-950/20 rounded-lg transition-all text-[13px] sm:text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          {tr('Logout', 'Deconnexion')}
        </button>
      </div>
    </div>
  )
}
