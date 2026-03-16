import {
  Truck,
  Package,
  Route,
  MapPin,
  ArrowRight,
  Zap,
  BarChart3,
  Phone,
  Camera,
  Bell,
  CheckCircle2,
  Users,
  Globe,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Navbar from "@/components/home/navbar"
import Footer from "@/components/home/footer"
import CTASection from "@/components/home/cta-section"
import LogisticsHero from "@/components/home/logistics-hero"
import ScrollReveal from "@/components/home/scroll-reveal"
import PageIntro from "@/components/home/page-intro"

type FeatureCard = {
  icon: LucideIcon
  title: string
  desc: string
  layout: string
  iconWrap: string
  titleSize: string
  bodyWidth?: string
  preview: string
}

const featureCards: FeatureCard[] = [
  {
    icon: Package,
    title: "Shipment Posting",
    desc: "Quickly create shipments with origin, destination, dates, size, and special notes.",
    layout: "lg:col-span-3 lg:min-h-[21rem]",
    iconWrap: "h-14 w-14 rounded-2xl",
    titleSize: "text-2xl sm:text-3xl",
    bodyWidth: "max-w-2xl",
    preview: "shipment",
  },
  {
    icon: Route,
    title: "Route & Capacity Posting",
    desc: "Truckers can post available routes and capacity for multi-shipment loading.",
    layout: "lg:col-span-2 lg:min-h-[18rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-xl",
    preview: "route",
  },
  {
    icon: Zap,
    title: "Automated Matching",
    desc: "Smart matching engine connects shipments with the best available routes and trucks.",
    layout: "lg:col-span-1 lg:min-h-[18rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-xl",
    preview: "matching",
  },
  {
    icon: MapPin,
    title: "Live GPS Tracking",
    desc: "Real-time tracking with shareable links so shippers always know where their goods are.",
    layout: "lg:col-span-1 lg:min-h-[16rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-lg",
    preview: "tracking",
  },
  {
    icon: Camera,
    title: "Proof of Delivery",
    desc: "Photo-based pickup and delivery confirmation for complete transparency.",
    layout: "lg:col-span-1 lg:min-h-[16rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-lg",
    preview: "delivery",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Get alerts for new matching opportunities, status updates, and delivery milestones.",
    layout: "lg:col-span-1 lg:min-h-[16rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-lg",
    preview: "notifications",
  },
  {
    icon: Phone,
    title: "Direct Contact",
    desc: "Seamless phone number sharing between matched shippers and truckers.",
    layout: "lg:col-span-1 lg:min-h-[15rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-lg",
    preview: "contact",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Shipment history, performance statistics, and usage insights at your fingertips.",
    layout: "lg:col-span-2 lg:min-h-[15rem]",
    iconWrap: "h-12 w-12 rounded-xl",
    titleSize: "text-xl",
    preview: "analytics",
  },
]

function renderFeaturePreview(feature: FeatureCard) {
  const Icon = feature.icon

  switch (feature.preview) {
    case "shipment":
      return (
        <div className="relative min-h-[12rem] sm:min-h-[13rem] overflow-hidden rounded-[1.1rem] border border-border/70 bg-background/80">
          <div className="flex h-full min-h-[inherit] gap-0">
            {/* Left — form fields */}
            <div className="flex flex-1 flex-col justify-center gap-3 p-5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="h-2 w-2 rounded-full bg-primary/60" />
                </div>
                <div className="h-3 flex-1 rounded-full bg-border" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="h-2 w-2 rounded-full bg-primary/40" />
                </div>
                <div className="h-3 w-4/5 rounded-full bg-border/70" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="h-2 w-2 rounded-full bg-primary/30" />
                </div>
                <div className="h-3 w-2/3 rounded-full bg-border/60" />
              </div>
              <div className="mt-1 h-8 w-24 rounded-xl bg-primary/15" />
            </div>

            {/* Center — icon divider */}
            <div className="flex flex-col items-center justify-center gap-3 px-4">
              <div className="h-12 w-px bg-border/60" />
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-primary/10 text-accent ring-1 ring-primary/20 shadow-[0_8px_20px_hsl(var(--primary)/0.14)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="h-12 w-px bg-border/60" />
            </div>

            {/* Right — shipment summary card */}
            <div className="flex flex-1 flex-col justify-center gap-3 p-5">
              <div className="rounded-[1.1rem] border border-border/70 bg-card p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-2.5 w-16 rounded-full bg-border" />
                  <div className="h-5 w-12 rounded-full bg-primary/15" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary/50 flex-shrink-0" />
                    <div className="h-2.5 w-20 rounded-full bg-border/80" />
                  </div>
                  <div className="ml-1 h-px w-5 bg-border/40" />
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary/70 flex-shrink-0" />
                    <div className="h-2.5 w-24 rounded-full bg-border/80" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-6 flex-1 rounded-lg bg-muted/80" />
                  <div className="h-6 flex-1 rounded-lg bg-muted/80" />
                  <div className="h-6 w-6 rounded-lg bg-primary/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    case "route":
      return (
        <div className="relative min-h-[10rem]">
          <div className="absolute left-[10%] top-[48%] h-1.5 w-[68%] rounded-full bg-border" />
          <div className="absolute left-[10%] top-[46%] h-5 w-5 rounded-full border-4 border-card bg-primary/60" />
          <div className="absolute left-[42%] top-[46%] h-5 w-5 rounded-full border-4 border-card bg-primary/40" />
          <div className="absolute right-[14%] top-[46%] h-5 w-5 rounded-full border-4 border-card bg-primary/70" />
          <div className="absolute left-[18%] top-[18%] flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-primary/10 text-accent ring-1 ring-primary/15 shadow-[0_12px_30px_hsl(var(--primary)/0.14)]">
            <Icon className="h-6 w-6" />
          </div>
          <div className="absolute right-[10%] top-[20%] rounded-[1.2rem] border border-border/80 bg-card px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <div className="h-3 w-16 rounded-full bg-border" />
            <div className="mt-2 h-3 w-12 rounded-full bg-border/80" />
          </div>
        </div>
      )
    case "matching":
      return (
        <div className="relative min-h-[8.5rem]">
          <div className="absolute left-[8%] top-[28%] h-16 w-[34%] rounded-[1.2rem] border border-border/80 bg-card shadow-[0_14px_24px_rgba(15,23,42,0.05)]" />
          <div className="absolute right-[8%] top-[28%] h-16 w-[34%] rounded-[1.2rem] border border-border/80 bg-card shadow-[0_14px_24px_rgba(15,23,42,0.05)]" />
          <div className="absolute left-1/2 top-[36%] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-primary/10 text-accent ring-1 ring-primary/15">
            <Icon className="h-5 w-5" />
          </div>
          <div className="absolute left-[30%] top-[48%] h-1 w-[14%] rounded-full bg-primary/50" />
          <div className="absolute right-[30%] top-[48%] h-1 w-[14%] rounded-full bg-primary/50" />
        </div>
      )
    case "tracking":
      return (
        <div className="relative min-h-[8.5rem] overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/80">
          {/* grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:26px_26px]" />
          {/* dashed route line via SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
            <polyline
              points="28,76 68,54 112,64 158,28"
              fill="none"
              stroke="hsl(var(--primary)/0.45)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
            />
          </svg>
          {/* origin dot */}
          <div className="absolute left-[12%] top-[68%] h-3 w-3 rounded-full bg-primary/40 ring-4 ring-primary/10" />
          {/* truck icon badge — mid-route */}
          <div className="absolute left-[50%] top-[53%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-card text-accent shadow-[0_8px_20px_hsl(var(--primary)/0.18)] ring-1 ring-border/60">
            <Icon className="h-4 w-4" />
          </div>
          {/* destination pin */}
          <div className="absolute right-[16%] top-[20%] flex h-7 w-7 items-center justify-center rounded-full bg-primary/70 text-primary-foreground shadow-[0_4px_12px_hsl(var(--primary)/0.35)]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      )
    case "delivery":
      return (
        <div className="relative min-h-[8.5rem]">
          <div className="absolute left-[12%] top-[18%] h-[64%] w-[62%] rounded-[1.5rem] border border-border/80 bg-card p-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <div className="flex h-full items-center justify-center rounded-[1.1rem] bg-muted/70">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-accent">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="absolute right-[10%] top-[54%] rounded-xl border border-border/80 bg-card px-3 py-2 shadow-[0_12px_22px_rgba(15,23,42,0.05)]">
            <div className="h-2.5 w-10 rounded-full bg-border" />
            <div className="mt-2 h-2.5 w-14 rounded-full bg-primary/25" />
          </div>
        </div>
      )
    case "notifications":
      return (
        <div className="relative min-h-[8.5rem]">
          {[0, 1, 2].map((stack) => (
            <div
              key={stack}
              className={`absolute left-[12%] right-[14%] rounded-[1.1rem] border border-border/80 bg-card px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)] ${stack === 0 ? "top-[18%]" : stack === 1 ? "top-[38%] left-[18%] right-[8%]" : "top-[58%]"}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-16 rounded-full bg-border" />
                  <div className="h-2.5 w-24 rounded-full bg-border/80" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    case "contact":
      return (
        <div className="relative min-h-[8.5rem]">
          <div className="absolute left-[16%] top-[16%] h-[68%] w-[34%] rounded-[1.4rem] border border-border/80 bg-card shadow-[0_14px_30px_rgba(15,23,42,0.06)]" />
          <div className="absolute right-[10%] top-[24%] h-16 w-[40%] rounded-[1.2rem] border border-border/80 bg-muted/70" />
          <div className="absolute right-[16%] top-[54%] h-12 w-[30%] rounded-[1rem] border border-border/80 bg-card" />
          <div className="absolute left-[25%] top-[34%] flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-accent ring-1 ring-primary/15">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      )
    case "analytics":
      return (
        <div className="relative min-h-[10rem] overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/85 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-3 w-24 rounded-full bg-border" />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex h-[5.8rem] items-end gap-3">
            <div className="h-[42%] flex-1 rounded-t-xl bg-primary/20" />
            <div className="h-[68%] flex-1 rounded-t-xl bg-primary/35" />
            <div className="h-[54%] flex-1 rounded-t-xl bg-primary/25" />
            <div className="h-[86%] flex-1 rounded-t-xl bg-primary/55" />
            <div className="h-[62%] flex-1 rounded-t-xl bg-primary/30" />
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PageIntro />
      <Navbar />

      <LogisticsHero />

      <section id="about-us" className="relative overflow-hidden bg-muted py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.32)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.32)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute right-0 top-0 h-72 w-72 bg-primary/10 blur-[110px]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_46%,hsl(var(--primary)/0.05)_50%,transparent_54%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-16 mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              About Us
            </p>
            <h2 className="text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl">
              Everything you need to <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">move</span> freight efficiently
            </h2>
            
          </ScrollReveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(220px,_1fr)]">
            {featureCards.map((feature, i) => (
              <ScrollReveal key={feature.title} delay={i * 90} className={feature.layout}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-card p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08),0_4px_10px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)] sm:p-5">
                  <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-border/60" />
                  <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)/0.94))]" />
                  <div className="pointer-events-none absolute -bottom-5 left-6 right-6 h-10 rounded-full bg-foreground/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10 flex h-full flex-col gap-5">
                    <div className="relative overflow-hidden rounded-[1.6rem] border border-border/70 bg-background/80 p-4 shadow-[inset_0_1px_0_hsl(var(--card)),0_14px_30px_rgba(15,23,42,0.06)]">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full bg-primary/50" />
                          <span className="h-2.5 w-2.5 rounded-full bg-border" />
                        </div>
                        <div className="h-8 w-14 rounded-full border border-border/80 bg-card/80" />
                      </div>

                      {renderFeaturePreview(feature)}
                    </div>

                    <div className="flex flex-1 flex-col justify-end px-1 pb-1">
                      <h3 className={`${feature.titleSize} mb-3 text-balance font-bold uppercase tracking-[0.08em] text-card-foreground`}>
                        {feature.title}
                      </h3>
                      <p className={`text-sm leading-7 text-muted-foreground sm:text-[0.96rem] ${feature.bodyWidth ?? "max-w-none"}`}>
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="guide" className="scroll-mt-24 pt-8 pb-20 lg:pt-2 lg:pb-28 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Guide</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">Get moving in 3 simple steps</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign Up", desc: "Set up your profile with your business info and preferences.", icon: Users },
              { step: "02", title: "Post or Browse", desc: "Shippers post shipments, truckers post routes. Our engine automatically finds the best matches.", icon: Globe },
              { step: "03", title: "Connect & Deliver", desc: "Get matched, share contact details, confirm pickups and deliveries with photo proof.", icon: CheckCircle2 },
            ].map((step, i) => (
              <ScrollReveal key={i} delay={i * 100} className="relative flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-6">
                  <step.icon className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-accent tracking-widest uppercase mb-2">Step {step.step}</span>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%_-_1rem)] w-8">
                    <ArrowRight className="w-6 h-6 text-border" />
                  </div>
                )}
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* For Shippers & Truckers */}
      <section className="py-20 lg:py-8 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Shippers */}
            <ScrollReveal className="group rounded-2xl border border-border bg-card p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground">For Shippers</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Post your shipments, get matched with reliable truckers, and track your goods from pickup to delivery.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Post shipments with full details and photos",
                  "Get automatically matched with available trucks",
                  "Track deliveries in real-time with GPS",
                  "Receive photo proof of pickup and delivery",
                  "View complete shipment history and analytics",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-card-foreground">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            {/* For Truckers */}
            <ScrollReveal delay={100} className="group rounded-2xl border border-border bg-card p-8 lg:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-card-foreground">For Truckers</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Post your routes and available capacity. Fill empty miles and manage multiple loads on a single trip.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Post routes with capacity and schedule",
                  "Get matched with shipments along your route",
                  "Manage multi-stop, multi-load trips",
                  "Reduce empty return trips and boost revenue",
                  "Build your reputation with delivery confirmations",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-card-foreground">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <ScrollReveal>
        <CTASection />
      </ScrollReveal>

      <Footer />
    </div>
  )
}
