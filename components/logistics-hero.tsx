"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import styles from "./logistics-hero.module.css"

const particles = [
  { left: "6%", top: "18%", size: "5px", duration: "6.2s", delay: "0.2s" },
  { left: "14%", top: "68%", size: "4px", duration: "7s", delay: "0.9s" },
  { left: "24%", top: "34%", size: "6px", duration: "8s", delay: "0.3s" },
  { left: "34%", top: "58%", size: "4px", duration: "7.8s", delay: "1.3s" },
  { left: "44%", top: "14%", size: "5px", duration: "9.2s", delay: "0.5s" },
  { left: "52%", top: "46%", size: "5px", duration: "7.3s", delay: "1.1s" },
  { left: "61%", top: "22%", size: "4px", duration: "8.6s", delay: "0.6s" },
  { left: "68%", top: "74%", size: "6px", duration: "7.1s", delay: "1.5s" },
  { left: "75%", top: "38%", size: "5px", duration: "8.3s", delay: "0.8s" },
  { left: "84%", top: "62%", size: "4px", duration: "9.1s", delay: "0.4s" },
  { left: "92%", top: "20%", size: "5px", duration: "7.9s", delay: "1.2s" },
]

const headlineWords = [
  { label: "Move" },
  { label: "freight" },
  { label: "smarter", accent: true },
  { label: "," },
  { label: "not" },
  { label: "emptier." },
]

export default function LogisticsHero() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updatePreference)
      return () => mediaQuery.removeEventListener("change", updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return (
    <section className={`${styles.hero} ${prefersReducedMotion ? styles.reduceMotion : ""}`}>
      <div className={styles.particles} aria-hidden="true">
        {particles.map((particle, index) => (
          <span
            key={`${particle.left}-${index}`}
            className={styles.particle}
            style={
              {
                "--left": particle.left,
                "--top": particle.top,
                "--size": particle.size,
                "--duration": particle.duration,
                "--delay": particle.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className={styles.heroInner}>
        <div className={styles.layout}>
          <div className={styles.copy}>
            <div className={styles.eyebrow}>
              <Zap size={14} />
              Connecting Shippers & Truckers
            </div>

            <h1 className={styles.headline}>
              {headlineWords.map((word, index) => (
                <span
                  key={`${word.label}-${index}`}
                  className={`${styles.word} ${word.accent ? styles.primaryAccent : ""}`.trim()}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {word.label}
                  {index < headlineWords.length - 1 ? <span className={styles.wordSpace} /> : null}
                </span>
              ))}
            </h1>

            <p className={styles.subtitle}>
              FI TRI9I connects shippers with truckers to reduce empty return trips, lower costs, and maximize every mile on the road.
            </p>

            <div className={styles.ctaRow}>
              <Link href="/signup" className={styles.primaryCta}>
                Get Started Free
                <ArrowRight size={16} style={{ marginLeft: "0.4rem" }} />
              </Link>
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