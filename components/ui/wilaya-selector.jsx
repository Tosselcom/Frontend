"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import axios from "axios"
import { X } from "lucide-react"
import { getApiUrl } from "@/lib/api"

export default function WilayaSelector({
  label,
  value,
  onChange,
  placeholder = "Select wilaya",
  referenceWilaya = "",
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [wilayas, setWilayas] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) {
      setSearch(value || "")
    }
  }, [value, open])

  useEffect(() => {
    const fetchWilayas = async () => {
      try {
        const endpoint = referenceWilaya
          ? getApiUrl(`/api/wilayas/nearby?from=${encodeURIComponent(referenceWilaya)}`)
          : getApiUrl("/api/wilayas")

        const response = await axios.get(endpoint)
        setWilayas(Array.isArray(response.data) ? response.data : [])
      } catch {
        setWilayas([])
      }
    }

    fetchWilayas()
  }, [referenceWilaya])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return wilayas
    return wilayas.filter((item) => String(item.name || "").toLowerCase().includes(normalized))
  }, [search, wilayas])

  return (
    <div className="relative" ref={containerRef}>
      {label ? <label className="block text-sm font-medium text-foreground mb-2">{label}</label> : null}
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              if (event.target.value.trim() === "") {
                onChange?.("")
              }
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            required={required && !value}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-left text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />

          {open ? (
            <div className="absolute z-50 mt-2 w-full left-0 rounded-lg border border-border bg-card shadow-lg">
              <div className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No wilaya found</p>
                ) : (
                  filtered.map((wilaya) => (
                    <button
                      key={wilaya.id || wilaya.name}
                      type="button"
                      onClick={() => {
                        onChange?.(wilaya.name)
                        setSearch(wilaya.name)
                        setOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      <span>{wilaya.name}</span>
                      {typeof wilaya.distanceKm === "number" ? (
                        <span className="text-xs text-muted-foreground">{wilaya.distanceKm} km</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange?.("")
              setSearch("")
            }}
            className="px-2 py-2 bg-muted border border-border rounded-lg text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
