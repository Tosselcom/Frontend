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
import LogisticsHero from "@/components/logistics-hero"
import ScrollReveal from "@/components/scroll-reveal"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <LogisticsHero />

      {/* Section below hero with soft beige-like background from theme token */}
      <section id="about-us" className="py-20 lg:py-28 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">About Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">Everything you need to move freight efficiently</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              From posting shipments to tracking deliveries, our platform handles the entire logistics lifecycle.
            </p>
          </ScrollReveal>
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
              <ScrollReveal
                key={i}
                delay={i * 100}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-accent mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="guide" className="py-20 lg:py-28 bg-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Guide</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">Get moving in 3 simple steps</h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign Up & Choose Role", desc: "Register as a shipper or trucker. Set up your profile with your business info and preferences.", icon: Users },
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
      <section className="py-20 lg:py-8 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Shippers */}
            <ScrollReveal className="rounded-2xl border border-border bg-card p-8 lg:p-10">
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
            </ScrollReveal>

            {/* For Truckers */}
            <ScrollReveal delay={100} className="rounded-2xl border border-border bg-card p-8 lg:p-10">
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
