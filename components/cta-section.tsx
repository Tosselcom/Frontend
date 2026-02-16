import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function CTASection() {
  return (
    <section className="py-20 lg:py-28 bg-secondary-foreground">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-secondary text-balance mb-6">
          Ready to transform your freight operations?
        </h2>
        <p className="text-lg text-secondary/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          Join thousands of shippers and truckers already using 100%TOSSELCOM to move freight more efficiently.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/20 px-8 py-4 text-sm font-semibold text-secondary hover:bg-secondary/5 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}
