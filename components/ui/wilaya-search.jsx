'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import { X, ChevronDown } from 'lucide-react'
import { getApiUrl } from '@/lib/api'

export default function WilayaSearch({
  label,
  value,
  onChange,
  placeholder = 'Search wilaya',
  referenceWilaya = '',
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const [wilayas, setWilayas] = useState([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const fetchWilayas = async () => {
      setLoading(true)
      try {
        const endpoint = referenceWilaya
          ? getApiUrl(`/api/wilayas/nearby?from=${encodeURIComponent(referenceWilaya)}`)
          : getApiUrl('/api/wilayas')

        const response = await axios.get(endpoint)
        setWilayas(Array.isArray(response.data) ? response.data : [])
      } catch {
        setWilayas([])
      } finally {
        setLoading(false)
      }
    }

    fetchWilayas()
  }, [referenceWilaya])

  useEffect(() => {
    setSearch(value || '')
  }, [value])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return wilayas
    return wilayas.filter((item) =>
      String(item.name || '').toLowerCase().includes(normalized)
    )
  }, [search, wilayas])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (wilayaName) => {
    onChange(wilayaName)
    setSearch(wilayaName)
    setOpen(false)
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setSearch(val)
    onChange(val)
    setOpen(true)
  }

  const handleClear = () => {
    setSearch('')
    onChange('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 pr-8 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background/50 rounded transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {open && (
          <div className="absolute z-50 mt-1 w-full left-0 rounded-lg border border-border bg-card shadow-lg">
            {loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Loading wilayas...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {search ? 'No wilaya found' : 'No wilayas available'}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {filtered.map((wilaya) => (
                  <button
                    key={wilaya.id || wilaya.name}
                    type="button"
                    onClick={() => handleSelect(wilaya.name)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm text-foreground"
                  >
                    {wilaya.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
