import Link from "next/link"
import {
  Truck,
  Package,
  Route,
  MapPin,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Phone,
  Camera,
  Bell,
  CheckCircle2,
  Users,
  Globe,
} from "lucide-react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CTASection from "@/components/cta-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 bg-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary-foreground">
                <Zap className="w-4 h-4" />
                <span>Connecting Shippers & Truckers</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-foreground leading-tight text-balance">
                Move freight <span className="text-primary-foreground">smarter</span>, not emptier.
              </h1>
              <p className="text-lg text-secondary-foreground/70 max-w-xl leading-relaxed">
                100%TOSSELCOM connects shippers with truckers to reduce empty return trips, lower costs, and maximize every mile on the road.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/#guide"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary-foreground/20 px-6 py-3.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary-foreground/5 transition-all"
                >
                  See Guide
                </Link>
              </div>
              <div className="flex gap-10 pt-4">
                <div>
                  <p className="text-3xl font-bold text-primary-foreground">2.4K+</p>
                  <p className="text-sm text-secondary-foreground/50">Active Users</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary-foreground">18K+</p>
                  <p className="text-sm text-secondary-foreground/50">Loads Matched</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary-foreground">94%</p>
                  <p className="text-sm text-secondary-foreground/50">Efficiency Rate</p>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl bg-secondary-foreground/5 border border-secondary-foreground/10 p-8 backdrop-blur-sm">
                {/* Mock Dashboard Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-secondary-foreground">Active Shipments</h3>
                    <span className="text-xs font-medium text-primary-foreground bg-primary/20 px-2.5 py-1 rounded-full">Live</span>
                  </div>
                  {[
                    { from: "Alger", to: "Setif", status: "In Transit", weight: "2.4T", time: "4h left" },
                    { from: "Oran", to: "Tlemcen", status: "Matched", weight: "1.8T", time: "Pickup tomorrow" },
                    { from: "Blida", to: "Constantine", status: "Posted", weight: "3.1T", time: "7h left" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-xl bg-secondary p-4 border border-secondary-foreground/5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15">
                        <Package className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-foreground">
                          {item.from} &rarr; {item.to}
                        </p>
                        <p className="text-xs text-secondary-foreground/50">{item.weight} &middot; {item.time}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        item.status === "In Transit" ? "bg-green-500/20 text-green-300" :
                        item.status === "Matched" ? "bg-blue-500/20 text-blue-300" :
                        "bg-yellow-500/20 text-yellow-300"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about-us" className="py-20 lg:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">About Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">Everything you need to move freight efficiently</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              From posting shipments to tracking deliveries, our platform handles the entire logistics lifecycle.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package, title: "Shipment Posting", desc: "Quickly create shipments with origin, destination, dates, size, and special notes." },
              { icon: Route, title: "Route & Capacity Posting", desc: "Truckers can post available routes and capacity for multi-shipment loading." },
              { icon: Zap, title: "Automated Matching", desc: "Smart matching engine connects shipments with the best available routes and trucks." },
              { icon: MapPin, title: "Live GPS Tracking", desc: "Real-time tracking with shareable links so shippers always know where their goods are." },
              { icon: Camera, title: "Proof of Delivery", desc: "Photo-based pickup and delivery confirmation for complete transparency." },
              { icon: Bell, title: "Smart Notifications", desc: "Get alerts for new matching opportunities, status updates, and delivery milestones." },
              { icon: Phone, title: "Direct Contact", desc: "Seamless phone number sharing between matched shippers and truckers." },
              { icon: BarChart3, title: "Analytics Dashboard", desc: "Shipment history, performance statistics, and usage insights at your fingertips." },
              { icon: Shield, title: "Secure Platform", desc: "Encrypted data, role-based access, and fraud prevention keep your business safe." },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-accent mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="guide" className="py-20 lg:py-28 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Guide</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">Get moving in 3 simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign Up & Choose Role", desc: "Register as a shipper or trucker. Set up your profile with your business info and preferences.", icon: Users },
              { step: "02", title: "Post or Browse", desc: "Shippers post shipments, truckers post routes. Our engine automatically finds the best matches.", icon: Globe },
              { step: "03", title: "Connect & Deliver", desc: "Get matched, share contact details, confirm pickups and deliveries with photo proof.", icon: CheckCircle2 },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Shippers & Truckers */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Shippers */}
            <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
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
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                Start as a Shipper <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* For Truckers */}
            <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
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
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                Start as a Trucker <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CTASection />

      <Footer />
    </div>
  )
}
