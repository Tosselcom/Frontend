"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import styles from "./scroll-reveal.module.css"

type ScrollRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  distance?: number
}

export default function ScrollReveal({ children, className = "", delay = 0, distance = 20 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  const style = {
    transitionDelay: `${delay}ms`,
    "--scroll-distance": `${distance}px`,
  } as CSSProperties

  return (
    <div ref={ref} style={style} className={`${styles.reveal} ${isVisible ? styles.visible : ""} ${className}`}>
      {children}
    </div>
  )
}
