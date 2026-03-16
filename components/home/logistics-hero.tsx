"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button"
import styles from "./logistics-hero.module.css"

export default function LogisticsHero() {
  const router = useRouter()

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.layout}>
          <div className={styles.copy}>
            <h1 className={styles.headline}>
              <span className="text-primary">Connect</span> the right load to the right truck.
            </h1>

            <p className={styles.subtitle}>
              FI TRi9i connects shippers with truckers to reduce empty return trips, lower costs, and maximize every mile on the road.
            </p>

            <div className={styles.ctaRow}>
              <InteractiveHoverButton
                text="Get Started Free"
                className="w-44"
                onClick={() => router.push("/signup")}
                aria-label="Get Started Free"
              />
              <Link href="/#guide" className={styles.secondaryCta}>
                See Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}