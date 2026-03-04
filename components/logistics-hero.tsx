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
              Move freight <span className={styles.primaryAccent}>smarter</span>, not emptier.
            </h1>

            <p className={styles.subtitle}>
              100%TOSSELCOM connects shippers with truckers to reduce empty return trips, lower costs, and maximize every mile on the road.
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

          <div className={styles.mapPanel}>
            <div className={styles.mapOverlay} />

            <svg className={styles.routeSvg} viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                id="routePath"
                className={`${styles.routePath} ${!prefersReducedMotion ? styles.animateRoute : ""}`}
                d="M90,325 C145,260 235,260 288,205 C342,148 395,148 455,182 C535,226 590,198 635,115"
              />

              <circle className={styles.cityDot} cx="90" cy="325" r="7" style={{ animationDelay: "0.7s" }} />
              <circle className={styles.cityDot} cx="288" cy="205" r="7" style={{ animationDelay: "1.8s" }} />
              <circle className={styles.cityDot} cx="455" cy="182" r="7" style={{ animationDelay: "2.7s" }} />
              <circle className={styles.cityDot} cx="635" cy="115" r="7" style={{ animationDelay: "3.6s" }} />

              <g className={styles.truck}>
                <rect x="-16" y="-9" width="24" height="14" rx="2" fill="#ffffff" />
                <rect x="7" y="-6" width="10" height="11" rx="2" fill="#d8eaff" />
                <circle cx="-8" cy="7" r="3" fill="#1a2a45" />
                <circle cx="8" cy="7" r="3" fill="#1a2a45" />
                {!prefersReducedMotion && (
                  <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyTimes="0;0.76;1" keyPoints="0;1;1" calcMode="linear">
                    <mpath href="#routePath" />
                  </animateMotion>
                )}
              </g>
            </svg>

            <div className={`${styles.shipmentCard} ${styles.cardOne}`}>
              <p className={styles.cardTitle}>Shipment</p>
              <p className={styles.cardRoute}>Alger → Oran</p>
              <p className={styles.cardMeta}>12.5T • Mar 04</p>
            </div>

            <div className={`${styles.shipmentCard} ${styles.cardTwo}`}>
              <p className={styles.cardTitle}>Shipment</p>
              <p className={styles.cardRoute}>Setif → Blida</p>
              <p className={styles.cardMeta}>8.1T • Mar 05</p>
            </div>

            <div className={`${styles.shipmentCard} ${styles.cardThree}`}>
              <p className={styles.cardTitle}>Shipment</p>
              <p className={styles.cardRoute}>Tlemcen → Alger</p>
              <p className={styles.cardMeta}>16.3T • Mar 06</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}