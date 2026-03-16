"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

export default function PageIntro() {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setVisible(true)

    const leaveTimer = setTimeout(() => setLeaving(true), 1900)
    const doneTimer = setTimeout(() => setVisible(false), 2850)

    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div className={`page-intro${leaving ? " page-intro-leave" : ""}`}>
      <div className="page-intro-inner">
        <Image
          src="/logo dark.svg"
          alt="FI TRI9I"
          width={220}
          height={80}
          priority
          className="page-intro-logo"
        />
        <div className="page-intro-line" />
      </div>
    </div>
  )
}
