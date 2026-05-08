'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

export default function WilayaSelectorMulti({
  label,
  values = [],
  onChange,
  placeholder = 'Select wilayas',
  referenceWilaya = '',
  required = false,
  options = null,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [wilayas, setWilayas] = useState([])

  useEffect(() => {
    if (Array.isArray(options)) {
      setWilayas(options)
      return
    }

    const fetchWilayas = async () => {
      try {
        const endpoint = referenceWilaya
          ? getApiUrl(`/api/wilayas/nearby?from=${encodeURIComponent(referenceWilaya)}`)
          : getApiUrl('/api/wilayas')

        const response = await axios.get(endpoint)
        setWilayas(Array.isArray(response.data) ? response.data : [])
      } catch {
        setWilayas([])
      }
    }

    fetchWilayas()
  }, [referenceWilaya, options])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return wilayas
    return wilayas.filter((item) => String(item.name || '').toLowerCase().includes(normalized))
  }, [search, wilayas])

  const handleAdd = (wilayaName) => {
    if (!values.includes(wilayaName)) {
      onChange([...values, wilayaName])
    }
    setSearch('')
  }

  const handleRemove = (wilayaName) => {
    onChange(values.filter((v) => v !== wilayaName))
  }

  const handleClearAll = () => {
    onChange([])
    setSearch('')
  }

  return (
    <div className="relative">
      {label ? <label className="block text-sm font-medium text-foreground mb-2">{label}</label> : null}
      <div className="space-y-2">
        {/* Display selected wilayas as tags */}
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-lg border border-border min-h-10">
            {values.map((wilaya) => (
              <div
                key={wilaya}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                <span>{wilaya}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(wilaya)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label={`Remove ${wilaya}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            required={required && values.length === 0}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {open ? (
            <div className="absolute z-50 mt-2 w-full left-0 rounded-lg border border-border bg-card shadow-lg">
              <div className="max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No wilaya found</p>
                ) : (
                  filtered.map((wilaya) => {
                    const isSelected = values.includes(wilaya.name)
                    return (
                      <button
                        key={wilaya.id || wilaya.name}
                        type="button"
                        onClick={() => {
                          handleAdd(wilaya.name)
                          setOpen(false)
                        }}
                        disabled={isSelected}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm ${
                          isSelected
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{wilaya.name}</span>
                        {isSelected && <X className="w-4 h-4" />}
                        {typeof wilaya.distanceKm === 'number' ? (
                          <span className="text-xs text-muted-foreground">{wilaya.distanceKm} km</span>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Clear all button */}
        {values.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full px-2 py-1 text-xs bg-muted border border-border rounded text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-1"
            title="Clear all selections"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}
