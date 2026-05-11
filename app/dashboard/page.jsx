'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  Menu,
  X,
  LogOut,
  PenLine,
  Settings,
  Bell,
  Package,
  Truck,
  Shield,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Trash2,
  Plus,
  ChevronRight,
  PhoneCall,
} from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import WilayaSearch from '@/components/ui/wilaya-search'
import WilayaSelectorMulti from '@/components/ui/wilaya-selector-multi'
import WilayaSelector from '@/components/ui/wilaya-selector'
import { discoverApiBaseUrl, getApiBaseUrl, getApiUrl } from '@/lib/api'

const DEFAULT_USER = { name: 'John User', email: 'john@tosselcom.com', role: 'shared', photo: '' }
const SHIPMENT_STATUS_FLOW = ['posted', 'matched', 'in_transit', 'delivered']
const VEHICLE_TYPE_OPTIONS = [
  { value: 'light_van', en: 'Light Van', fr: 'Fourgon leger' },
  { value: 'pickup_truck', en: 'Pickup Truck', fr: 'Pickup' },
  { value: 'box_truck', en: 'Box Truck', fr: 'Camion caisse' },
  { value: 'motorcycle_scooter', en: 'Motorcycle / Scooter', fr: 'Moto / Scooter' },
  { value: 'refrigerated_vehicle', en: 'Refrigerated Vehicle', fr: 'Vehicule frigorifique' },
]
const DEFAULT_VEHICLE_TYPE = VEHICLE_TYPE_OPTIONS[0].value

const VEHICLE_TYPE_ALIASES = {
  'light van': 'light_van',
  'light commercial van': 'light_van',
  'light commercial vans': 'light_van',
  'ford transit': 'light_van',
  'mercedes-benz sprinter': 'light_van',
  'pickup': 'pickup_truck',
  'pickup truck': 'pickup_truck',
  'pickup trucks': 'pickup_truck',
  'toyota hilux': 'pickup_truck',
  'ford f-150': 'pickup_truck',
  'box truck': 'box_truck',
  'box trucks': 'box_truck',
  'cube truck': 'box_truck',
  'cube trucks': 'box_truck',
  'isuzu npr': 'box_truck',
  'hino 300 series': 'box_truck',
  motorcycle: 'motorcycle_scooter',
  motorcycles: 'motorcycle_scooter',
  scooter: 'motorcycle_scooter',
  scooters: 'motorcycle_scooter',
  'motorcycle / scooter': 'motorcycle_scooter',
  'honda pcx': 'motorcycle_scooter',
  'yamaha nmax': 'motorcycle_scooter',
  refrigerated: 'refrigerated_vehicle',
  'refrigerated vehicle': 'refrigerated_vehicle',
  'refrigerated vehicles': 'refrigerated_vehicle',
  'reefer van': 'refrigerated_vehicle',
  'reefer truck': 'refrigerated_vehicle',
  'renault master': 'refrigerated_vehicle',
  'iveco daily': 'refrigerated_vehicle',
}

function getVehicleTypeOption(typeValue) {
  return VEHICLE_TYPE_OPTIONS.find((option) => option.value === typeValue) || VEHICLE_TYPE_OPTIONS[0]
}

function getVehicleTypeLabel(typeValue, language = 'English') {
  const option = getVehicleTypeOption(typeValue)
  return language === 'French' ? option.fr : option.en
}

function normalizeVehicleType(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase()
  if (!normalized) return DEFAULT_VEHICLE_TYPE

  const direct = VEHICLE_TYPE_OPTIONS.find((option) => option.value === normalized)
  if (direct) return direct.value

  if (VEHICLE_TYPE_ALIASES[normalized]) return VEHICLE_TYPE_ALIASES[normalized]

  return DEFAULT_VEHICLE_TYPE
}

function createVehicleAllocationInput(seed = {}) {
  return {
    type: normalizeVehicleType(seed.type || seed.name || seed.label),
    capacity: String(seed.capacity ?? ''),
    volume: String(seed.volume ?? ''),
  }
}

function getNextShipmentStatus(currentStatus) {
  const currentIndex = SHIPMENT_STATUS_FLOW.indexOf(currentStatus)
  if (currentIndex === -1) return 'posted'
  if (currentIndex >= SHIPMENT_STATUS_FLOW.length - 1) return null
  return SHIPMENT_STATUS_FLOW[currentIndex + 1]
}

function getShipmentStatusActionLabel(currentStatus) {
  if (currentStatus === 'posted') return 'Mark as Matched'
  if (currentStatus === 'matched') return 'Start Transit'
  if (currentStatus === 'in_transit') return 'Mark as Delivered'
  return 'Delivered'
}

function buildStatusHistoryFromCurrentStatus(currentStatus, baseDate) {
  const statusIndex = SHIPMENT_STATUS_FLOW.indexOf(currentStatus)
  const lastIndex = statusIndex === -1 ? 0 : statusIndex

  const parsedBaseDate = baseDate ? new Date(baseDate) : null
  const fallbackDate = new Date()

  return SHIPMENT_STATUS_FLOW.slice(0, lastIndex + 1).map((status, index) => {
    const historyDate = parsedBaseDate && !Number.isNaN(parsedBaseDate.getTime())
      ? new Date(parsedBaseDate.getTime() + index * 60 * 60 * 1000)
      : new Date(fallbackDate.getTime() + index * 60 * 60 * 1000)

    return {
      status,
      at: historyDate.toISOString(),
    }
  })
}

function ensureShipmentStatusHistory(shipment) {
  if (Array.isArray(shipment.statusHistory) && shipment.statusHistory.length > 0) {
    return shipment.statusHistory
  }

  return buildStatusHistoryFromCurrentStatus(shipment.status, shipment.date)
}

function formatStatusTimestamp(value) {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitialUser() {
  // Keep first render deterministic to avoid hydration mismatch.
  return DEFAULT_USER
}

function getStoredToken() {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('token') || ''
}

function parseNumericInput(value) {
  if (value == null) return Number.NaN
  const normalized = String(value).replace(',', '.').replace(/[^\d.-]/g, '').trim()
  if (!normalized) return Number.NaN
  return Number(normalized)
}

function formatWeightKg(value) {
  if (value == null || value === '') return 'N/A'
  const raw = String(value).trim()
  if (!raw) return 'N/A'
  if (/kg$/i.test(raw)) return raw
  return `${raw} kg`
}

function formatVolumeM3(value) {
  if (value == null || value === '') return 'N/A'
  const raw = String(value).trim()
  if (!raw) return 'N/A'
  if (/m\^?3$/i.test(raw) || /m³$/i.test(raw)) return raw
  return `${raw} m^3`
}

function resizeVehicleAllocationInputs(previousValues, nextCount) {
  const normalizedCount = Math.max(1, Math.floor(Number(nextCount) || 1))
  return Array.from({ length: normalizedCount }, (_, index) => {
    const previousEntry = previousValues?.[index]
    if (typeof previousEntry === 'object' && previousEntry != null) {
      return createVehicleAllocationInput(previousEntry)
    }
    return createVehicleAllocationInput({ capacity: previousEntry ?? '' })
  })
}

function normalizeVehicleAllocationRecords(rawValue, fallbackCapacity) {
  let parsedValue = rawValue

  if (typeof parsedValue === 'string') {
    const trimmedValue = parsedValue.trim()
    if (!trimmedValue) {
      parsedValue = null
    } else {
      try {
        parsedValue = JSON.parse(trimmedValue)
      } catch {
        parsedValue = null
      }
    }
  }

  const fallbackNumericCapacity = parseNumericInput(fallbackCapacity)
  const fallbackRecord = Number.isFinite(fallbackNumericCapacity) && fallbackNumericCapacity > 0
    ? [{ type: DEFAULT_VEHICLE_TYPE, name: getVehicleTypeLabel(DEFAULT_VEHICLE_TYPE), capacity: Math.round(fallbackNumericCapacity) }]
    : []

  if (parsedValue == null) {
    return fallbackRecord
  }

  if (!Array.isArray(parsedValue)) {
    return fallbackRecord
  }

  const normalizedRecords = parsedValue
    .map((entry, index) => {
      const rawCapacity = typeof entry === 'number'
        ? entry
        : entry?.capacity ?? entry?.value ?? entry?.amount ?? entry
      const parsedCapacity = parseNumericInput(rawCapacity)
      const rawVolume = typeof entry === 'object' ? (entry?.volume ?? entry?.vol ?? entry?.valueVolume ?? undefined) : undefined
      const parsedVolume = parseNumericInput(rawVolume)

      if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
        return null
      }

      const normalizedType = normalizeVehicleType(
        typeof entry === 'object' && entry != null
          ? entry.type || entry.vehicleType || entry.name || entry.label
          : '',
      )

      return {
        type: normalizedType,
        name: getVehicleTypeLabel(normalizedType),
        capacity: Math.round(parsedCapacity),
        ...(Number.isFinite(parsedVolume) && parsedVolume >= 0 ? { volume: Math.round(parsedVolume) } : {}),
      }
    })
    .filter(Boolean)

  return normalizedRecords.length > 0 ? normalizedRecords : fallbackRecord
}

function buildVehicleAllocationPayload(vehicleAllocationValues, totalCapacity, totalVolume) {
  const parsedTotalCapacity = parseNumericInput(totalCapacity)
  const parsedTotalVolume = totalVolume === undefined ? undefined : parseNumericInput(totalVolume)

  if (!Number.isFinite(parsedTotalCapacity) || parsedTotalCapacity <= 0) {
    return {
      error: 'Capacity must be a valid number greater than 0',
    }
  }

  const normalizedAllocations = Array.isArray(vehicleAllocationValues) && vehicleAllocationValues.length > 0
    ? vehicleAllocationValues.map((entry, index) => {
        const parsedCapacity = parseNumericInput(entry?.capacity ?? entry)
        if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
          return null
        }

        const normalizedType = normalizeVehicleType(entry?.type)
        const parsedVolume = parseNumericInput(entry?.volume)

        const result = {
          type: normalizedType,
          name: getVehicleTypeLabel(normalizedType),
          capacity: Math.round(parsedCapacity),
        }

        // Include volume if specified for this vehicle
        if (Number.isFinite(parsedVolume) && parsedVolume > 0) {
          result.volume = Math.round(parsedVolume)
        }

        return result
      })
    : [{ type: DEFAULT_VEHICLE_TYPE, name: getVehicleTypeLabel(DEFAULT_VEHICLE_TYPE), capacity: Math.round(parsedTotalCapacity) }]

  const invalidIndex = normalizedAllocations.findIndex((entry) => entry == null)
  if (invalidIndex !== -1) {
    return {
      error: `Vehicle ${invalidIndex + 1} capacity must be a valid number greater than 0`,
    }
  }

  const roundedTotalCapacity = Math.round(parsedTotalCapacity)
  const allocationTotal = normalizedAllocations.reduce((sum, entry) => sum + entry.capacity, 0)

  if (allocationTotal !== roundedTotalCapacity) {
    return {
      error: `Vehicle capacities must add up to ${formatWeightKg(roundedTotalCapacity)}`,
    }
  }

  // Handle volume distribution
  if (parsedTotalVolume !== undefined && (!Number.isFinite(parsedTotalVolume) || parsedTotalVolume <= 0)) {
    return { error: 'Volume must be a valid number greater than 0' }
  }

  // Check if any vehicles have user-specified volumes
  const vehiclesWithUserVolumes = normalizedAllocations.filter((entry) => entry.volume !== undefined)
  
  if (vehiclesWithUserVolumes.length > 0 && parsedTotalVolume !== undefined) {
    // Volumes specified - validate they sum correctly
    const roundedTotalVolume = Math.round(parsedTotalVolume)
    const userVolumeSum = normalizedAllocations.reduce((sum, entry) => sum + (entry.volume || 0), 0)
    
    if (userVolumeSum !== roundedTotalVolume) {
      return {
        error: `Vehicle volumes must add up to ${formatVolumeM3(roundedTotalVolume)}`,
      }
    }
  } else if (parsedTotalVolume !== undefined && parsedTotalVolume > 0) {
    // No user-specified volumes, auto-distribute all proportionally
    const roundedTotalVolume = Math.round(parsedTotalVolume)
    let distributedSum = 0
    
    for (let i = 0; i < normalizedAllocations.length; i += 1) {
      const entry = normalizedAllocations[i]
      const share = Math.round((entry.capacity / allocationTotal) * roundedTotalVolume)
      entry.volume = share
      distributedSum += share
    }
    
    // fix rounding differences by adjusting last entry
    const diff = roundedTotalVolume - distributedSum
    if (diff !== 0 && normalizedAllocations.length > 0) {
      normalizedAllocations[normalizedAllocations.length - 1].volume += diff
    }
  }

  return {
    vehicleAllocation: normalizedAllocations,
  }
}

function formatVehicleAllocationSummary(vehicleAllocation, fallbackCapacity) {
  const normalizedAllocations = normalizeVehicleAllocationRecords(vehicleAllocation, fallbackCapacity)

  if (!normalizedAllocations.length) {
    return 'N/A'
  }

  return normalizedAllocations
    .map((entry) => {
      const base = `${getVehicleTypeLabel(normalizeVehicleType(entry.type || entry.name))}: ${formatWeightKg(entry.capacity)}`
      if (entry.volume != null) return `${base} / ${formatVolumeM3(entry.volume)}`
      return base
    })
    .join(', ')
}

function routeHasVehicleType(route, vehicleTypeFilter) {
  const normalizedFilters = Array.isArray(vehicleTypeFilter)
    ? vehicleTypeFilter.map((value) => normalizeRouteText(value)).filter(Boolean)
    : [normalizeRouteText(vehicleTypeFilter)].filter(Boolean)

  if (normalizedFilters.length === 0) return false

  const vehicleAllocations = Array.isArray(route?.vehicleAllocation) ? route.vehicleAllocation : []
  return vehicleAllocations.some((entry) => {
    const normalizedType = normalizeVehicleType(entry?.type || entry?.name || entry?.label)
    const normalizedTypeText = normalizeRouteText(normalizedType)
    const normalizedLabelText = normalizeRouteText(getVehicleTypeLabel(normalizedType))
    return normalizedFilters.some((filter) => normalizedTypeText.includes(filter) || normalizedLabelText.includes(filter))
  })
}

function getDialablePhone(rawPhone) {
  if (!rawPhone) return ''
  const normalized = String(rawPhone).replace(/[^\d+]/g, '').trim()
  if (!normalized) return ''
  if (normalized.startsWith('+')) return normalized
  return normalized.replace(/^00/, '+')
}

function formatDateDisplay(dateValue) {
  if (!dateValue) return ''
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return String(dateValue)
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function resolveDbId(postId, explicitDbId) {
  const parsedExplicit = Number(explicitDbId)
  if (Number.isFinite(parsedExplicit) && parsedExplicit > 0) {
    return parsedExplicit
  }

  const match = String(postId || '').match(/(?:SHP|ROUTE)-DB-(\d+)/i)
  if (!match) return null

  const parsedFromId = Number(match[1])
  if (!Number.isFinite(parsedFromId) || parsedFromId <= 0) return null
  return parsedFromId
}

function mapDeliveryPostFromDb(row) {
  const resolvedOwnerType = String(row.creator_type || row.user_type || row.ownerType || 'user').trim().toLowerCase() || 'user'
  const resolvedOwnerId = Number(row.user_id) || null
  const resolvedOwnerEmail = row.creator_email || row.ownerEmail || ''
  const resolvedOwnerName = row.creator_name || row.ownerName || row.ownerEmail || 'Unknown user'
  const resolvedVolume = row.volume ?? row.capacity ?? ''

  return {
    id: `SHP-DB-${row.id}`,
    dbId: row.id,
    itemName: row.itemName,
    origin: row.origin,
    destination: row.destination,
    weight: String(row.weight ?? ''),
    volume: String(resolvedVolume),
    capacity: String(resolvedVolume),
    dimensions: row.volume != null ? String(row.volume) : (row.capacity != null ? String(row.capacity) : 'N/A'),
    category: row.itemCategory || 'general',
    description: row.description || '',
    type: row.itemCategory || 'general',
    photo: '',
    date: row.deliveryDate || formatDateDisplay(row.created_at),
    status: 'posted',
    statusHistory: [{ status: 'posted', at: row.created_at || new Date().toISOString() }],
    ownerType: resolvedOwnerType,
    ownerId: resolvedOwnerId ? `${resolvedOwnerType}:${resolvedOwnerId}` : (resolvedOwnerEmail || resolvedOwnerName),
    ownerDbId: resolvedOwnerId,
    ownerEmail: resolvedOwnerEmail,
    ownerName: resolvedOwnerName,
  }
}

function mapAvailabilityPostFromDb(row) {
  const vehicleAllocation = normalizeVehicleAllocationRecords(row.vehicle_allocation, row.capacity)
  const interval = parseAvailabilityDateInterval(row.date)
  const isAvailabilityOnly = (row.postType || 'full_route') === 'availability_only'
  const departureLabel = isAvailabilityOnly
    ? (interval.start && interval.end ? `${interval.start} to ${interval.end}` : 'Flexible')
    : (row.date || formatDateDisplay(row.created_at))
  const resolvedOwnerType = String(row.creator_type || row.user_type || row.ownerType || 'user').trim().toLowerCase() || 'user'
  const resolvedOwnerId = Number(row.user_id) || null
  const resolvedOwnerEmail = row.creator_email || row.ownerEmail || ''
  const resolvedOwnerName = row.creator_name || row.ownerName || row.ownerEmail || 'Unknown user'

  return {
    id: `ROUTE-DB-${row.id}`,
    dbId: row.id,
    from: row.origin,
    to: row.destination,
    capacity: String(row.capacity ?? ''),
    volume: String(row.volume ?? row.capacity ?? ''),
    available: String(row.capacity ?? ''),
    departure: departureLabel,
    routeDateRaw: row.date || '',
    availabilityStartDate: interval.start,
    availabilityEndDate: interval.end,
    postType: row.postType || 'full_route',
    availableCity: row.available_city || '',
    vehicleAllocation,
    vehicleCount: vehicleAllocation.length,
    isLive: false,
    driverName: resolvedOwnerName,
    currentStop: '',
    ownerType: resolvedOwnerType,
    ownerId: resolvedOwnerId ? `${resolvedOwnerType}:${resolvedOwnerId}` : (resolvedOwnerEmail || resolvedOwnerName),
    ownerDbId: resolvedOwnerId,
    ownerEmail: resolvedOwnerEmail,
    ownerName: resolvedOwnerName,
  }
}

function getUserOwnerKey(userValue) {
  const userType = String(userValue?.userType || userValue?.creator_type || userValue?.user_type || userValue?.ownerType || '').trim().toLowerCase()
  const numericId = Number(userValue?.id || userValue?.user_id || userValue?.ownerDbId)
  const email = String(userValue?.email || userValue?.creator_email || userValue?.ownerEmail || '').trim().toLowerCase()
  const name = String(userValue?.name || userValue?.creator_name || userValue?.ownerName || '').trim().toLowerCase()

  if (userType && Number.isFinite(numericId) && numericId > 0) {
    return `${userType}:${numericId}`
  }

  if (email) {
    return userType ? `${userType}:${email}` : email
  }

  if (name) {
    return userType ? `${userType}:${name}` : name
  }

  return userType || ''
}

function getPostOwnerKey(postValue) {
  return getUserOwnerKey({
    id: postValue?.ownerDbId,
    email: postValue?.ownerEmail || postValue?.ownerId,
    name: postValue?.ownerName,
    userType: postValue?.ownerType,
  })
}

function getInitialDashboardLanguage() {
  if (typeof window === 'undefined') return 'English'
  try {
    const raw = window.localStorage.getItem('tosselcom.settings.v1')
    if (!raw) return 'English'
    const parsed = JSON.parse(raw)
    const savedLanguage = parsed?.appPrefs?.language
    return savedLanguage === 'French' ? 'French' : 'English'
  } catch {
    return 'English'
  }
}

function getLanguageMeta(language) {
  if (language === 'French') return { code: 'fr', dir: 'ltr' }
  return { code: 'en', dir: 'ltr' }
}

function tr(language, en, fr) {
  if (language === 'French') return fr
  return en
}

function getUserInitial(name) {
  const safeName = String(name || '').trim()
  if (!safeName) return 'U'
  return safeName.charAt(0).toUpperCase()
}

function splitFullName(fullName) {
  const safe = String(fullName || '').trim()
  if (!safe) return { firstName: '', lastName: '' }
  const parts = safe.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function buildFullName(firstName, lastName) {
  return [String(firstName || '').trim(), String(lastName || '').trim()].filter(Boolean).join(' ')
}

function getDemoDateLabel(monthIndex, day) {
  return new Date(new Date().getFullYear(), monthIndex, day).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

const todayString = new Date().toISOString().split('T')[0]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(getInitialUser)
  const [uiLanguage, setUiLanguage] = useState(getInitialDashboardLanguage)
  const currentUserKey = useMemo(() => getUserOwnerKey(user), [user])
  const userSettingsStorageKey = useMemo(() => {
    const scopedKey = currentUserKey || 'guest'
    return `tosselcom.settings.v1:${scopedKey}`
  }, [currentUserKey])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [role] = useState('shared')
  const [activeSection, setActiveSection] = useState('overview')
  const [routeTypeFilter, setRouteTypeFilter] = useState('all')
  const [shipmentOriginFilter, setShipmentOriginFilter] = useState('')
  const [shipmentDestinationFilter, setShipmentDestinationFilter] = useState('')
  const [shipmentWilayaFilters, setShipmentWilayaFilters] = useState([])
  const [shipmentCategoryFilter, setShipmentCategoryFilter] = useState('')
  const [shipmentCapacityFilter, setShipmentCapacityFilter] = useState('')
  const [shipmentVolumeFilter, setShipmentVolumeFilter] = useState('')
  const [shipmentCorridorOriginFilter, setShipmentCorridorOriginFilter] = useState('')
  const [shipmentCorridorDestinationFilter, setShipmentCorridorDestinationFilter] = useState('')
  const [shipmentBetweenWilaya1Filter, setShipmentBetweenWilaya1Filter] = useState('')
  const [shipmentBetweenWilaya2Filter, setShipmentBetweenWilaya2Filter] = useState('')
  const [routeOriginFilter, setRouteOriginFilter] = useState('')
  const [routeDestinationFilter, setRouteDestinationFilter] = useState('')
  const [routeWilayaFilters, setRouteWilayaFilters] = useState([])
  const [routeCorridorOriginFilter, setRouteCorridorOriginFilter] = useState('')
  const [routeCorridorDestinationFilter, setRouteCorridorDestinationFilter] = useState('')
  const [routeBetweenWilaya1Filter, setRouteBetweenWilaya1Filter] = useState('')
  const [routeBetweenWilaya2Filter, setRouteBetweenWilaya2Filter] = useState('')
  const [routeCapacityFilter, setRouteCapacityFilter] = useState('')
  const [routeVolumeFilter, setRouteVolumeFilter] = useState('')
  const [routeVehicleTypeFilters, setRouteVehicleTypeFilters] = useState([])
  const [postDateFilterStart, setPostDateFilterStart] = useState('')
  const [postDateFilterEnd, setPostDateFilterEnd] = useState('')

  const [detailView, setDetailView] = useState({ type: null, id: null })
  const realtimeSocketRef = useRef(null)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false)
  const [routePostType, setRoutePostType] = useState('full_route')
  const [formData, setFormData] = useState({ from: '', to: '', capacity: '', volume: '', vehicleCount: '1', vehicleAllocations: [createVehicleAllocationInput()], departure: '', availableCity: '', availabilityStartDate: '', availabilityEndDate: '' })
  const [archivedDeliveryPostsCount, setArchivedDeliveryPostsCount] = useState(0)
  const [archivedAvailabilityPostsCount, setArchivedAvailabilityPostsCount] = useState(0)
  const [shipmentFormData, setShipmentFormData] = useState({
    itemName: '',
    origin: '',
    destination: '',
    weight: '',
    capacity: '',
    deliveryDate: '',
    dimensions: '',
    category: 'general',
    description: '',
    photo: '',
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const userStr = sessionStorage.getItem('user')
    if (!userStr) return

    try {
      const parsed = JSON.parse(userStr)
      if (parsed && typeof parsed === 'object') {
        setUser((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // Ignore invalid storage payload and keep default user.
    }
  }, [])
  
  // Data State
  const [shipmentItems, setShipmentItems] = useState([])
  
  const [routeItems, setRouteItems] = useState([])

  const [matchingItems, setMatchingItems] = useState([])
  const [receivedInvitations, setReceivedInvitations] = useState([])
  const [sentInvitations, setSentInvitations] = useState([])
  const [selectedInvitationId, setSelectedInvitationId] = useState('')
  const getInvitationKey = (source, referenceId) => `${source}:${referenceId}`

  const sentInvitationKeys = useMemo(() => {
    const keys = {}

    sentInvitations
      .filter((invitation) => invitation?.status === 'pending')
      .forEach((invitation) => {
        const senderShipmentId = invitation?.deliveryPostDbId ? `SHP-DB-${invitation.deliveryPostDbId}` : null
        const senderRouteId = invitation?.availabilityPostDbId ? `ROUTE-DB-${invitation.availabilityPostDbId}` : null

        // Target-only invitations (no paired opposite post) should still lock their target card.
        if (senderRouteId && !senderShipmentId) {
          keys[getInvitationKey('community_route', senderRouteId)] = true
        }

        if (senderShipmentId && !senderRouteId) {
          keys[getInvitationKey('community_shipment', senderShipmentId)] = true
        }

        // Sender is client (delivery post owner) inviting a route post.
        if (invitation?.direction === 'client_to_trucker' && senderShipmentId && senderRouteId) {
          keys[getInvitationKey('route', senderRouteId)] = true
          keys[getInvitationKey('community_route', senderRouteId)] = true
        }

        // Sender is trucker (availability post owner) inviting a shipment post.
        if (invitation?.direction === 'trucker_to_client' && senderRouteId && senderShipmentId) {
          keys[getInvitationKey('route_relevant_shipment', senderShipmentId)] = true
          keys[getInvitationKey('community_shipment', senderShipmentId)] = true
        }

        // Only direct invitations should lock by recipient user id.
        // Post-linked invitations must stay scoped to the targeted post key.
        const isDirectInvitation = invitation?.direction === 'direct'
          && !invitation?.deliveryPostDbId
          && !invitation?.availabilityPostDbId

        if (isDirectInvitation && invitation?.recipientUserId) {
          keys[getInvitationKey('community_user', invitation.recipientUserId)] = true
        }
      })

    return keys
  }, [sentInvitations])

  const [baseNotifications, setBaseNotifications] = useState([])
  const [readNotificationIds, setReadNotificationIds] = useState([])

  const myShipmentItems = useMemo(
    () => shipmentItems.filter((shipment) => (
      getPostOwnerKey(shipment) === currentUserKey
    )),
    [shipmentItems, currentUserKey],
  )

  const myRouteItems = useMemo(
    () => routeItems.filter((route) => (
      getPostOwnerKey(route) === currentUserKey
    )),
    [routeItems, currentUserKey],
  )

  const invitationNotifications = useMemo(
    () => receivedInvitations
      .filter((invitation) => invitation.status === 'pending')
      .map((invitation) => ({
        id: `NOT-INV-${invitation.id}`,
        title: 'New invitation received',
        description: `${invitation.senderName} invited you for ${invitation.linkedPostId}`,
        eventType: 'invite_received',
        targetRole: invitation.senderRole === 'trucker' ? 'shipper' : 'trucker',
        invitationId: invitation.id,
        deepLink: {
          section: 'matching',
          invitationId: invitation.id,
        },
      })),
    [receivedInvitations],
  )

  const notifications = useMemo(
    () => [...invitationNotifications, ...baseNotifications].map((notification) => ({
      ...notification,
      isRead: Boolean(notification.isRead) || readNotificationIds.includes(notification.id),
    })),
    [invitationNotifications, baseNotifications, readNotificationIds],
  )

  const hasUnreadNotifications = useMemo(
    () => notifications.some((notification) => !notification.isRead),
    [notifications],
  )

  useEffect(() => {
    const meta = getLanguageMeta(uiLanguage)
    document.documentElement.lang = meta.code
    document.documentElement.dir = meta.dir
  }, [uiLanguage])

  const refreshDashboardData = async () => {
    const token = getStoredToken()
    if (!token) return

    const headers = { token }

    try {
      const [
        allDeliveryRes,
        allAvailabilityRes,
        myDeliveryRes,
        myAvailabilityRes,
        myDeliveryAllRes,
        myAvailabilityAllRes,
        receivedInvitationsRes,
        sentInvitationsRes,
        notificationsRes,
      ] = await Promise.all([
        axios.get(getApiUrl('/posts/delivery'), { headers }),
        axios.get(getApiUrl('/posts/availability'), { headers }),
        axios.get(getApiUrl('/posts/delivery/mine'), { headers }),
        axios.get(getApiUrl('/posts/availability/mine'), { headers }),
        axios.get(getApiUrl('/posts/delivery/mine?includeArchived=true'), { headers }),
        axios.get(getApiUrl('/posts/availability/mine?includeArchived=true'), { headers }),
        axios.get(getApiUrl('/invitations/received'), { headers }),
        axios.get(getApiUrl('/invitations/sent'), { headers }),
        axios.get(getApiUrl('/notifications'), { headers }).catch(() => ({ data: [] })),
      ])

      const allDeliveryRows = Array.isArray(allDeliveryRes.data) ? allDeliveryRes.data : []
      const allAvailabilityRows = Array.isArray(allAvailabilityRes.data) ? allAvailabilityRes.data : []
      const myDeliveryRows = Array.isArray(myDeliveryRes.data) ? myDeliveryRes.data : []
      const myAvailabilityRows = Array.isArray(myAvailabilityRes.data) ? myAvailabilityRes.data : []
      const myDeliveryAllRows = Array.isArray(myDeliveryAllRes.data) ? myDeliveryAllRes.data : []
      const myAvailabilityAllRows = Array.isArray(myAvailabilityAllRes.data) ? myAvailabilityAllRes.data : []
      const receivedRows = Array.isArray(receivedInvitationsRes.data) ? receivedInvitationsRes.data : []
      const sentRows = Array.isArray(sentInvitationsRes.data) ? sentInvitationsRes.data : []
      const notificationRows = Array.isArray(notificationsRes.data) ? notificationsRes.data : []

      const archivedDeliveryRows = myDeliveryAllRows.filter((row) => row?.archived_at)
      const archivedAvailabilityRows = myAvailabilityAllRows.filter((row) => row?.archived_at)

      const myDeliveryIds = new Set(myDeliveryRows.map((row) => row.id))
      const myAvailabilityIds = new Set(myAvailabilityRows.map((row) => row.id))

      const mergedDeliveryRows = allDeliveryRows.map((row) => {
        if (!myDeliveryIds.has(row.id)) return row
        const mine = myDeliveryRows.find((myRow) => myRow.id === row.id)
        return mine || row
      })

      const mergedAvailabilityRows = allAvailabilityRows.map((row) => {
        if (!myAvailabilityIds.has(row.id)) return row
        const mine = myAvailabilityRows.find((myRow) => myRow.id === row.id)
        return mine || row
      })

      let mappedShipments = mergedDeliveryRows.map(mapDeliveryPostFromDb)
      const mappedRoutes = mergedAvailabilityRows.map(mapAvailabilityPostFromDb)

      const myRouteWithAvailableCity = mappedRoutes.find((route) => (
        getPostOwnerKey(route) === currentUserKey
        && route.availableCity
      ))

      if (myRouteWithAvailableCity?.availableCity) {
        try {
          const sortedResponse = await axios.get(
            getApiUrl(`/api/posts/delivery-posts/sorted?available_city=${encodeURIComponent(myRouteWithAvailableCity.availableCity)}`),
            { headers }
          )
          const sortedRows = Array.isArray(sortedResponse.data) ? sortedResponse.data : []
          if (sortedRows.length > 0) {
            mappedShipments = sortedRows.map(mapDeliveryPostFromDb)
          }
        } catch {
          // Keep default ordering if sorted endpoint fails.
        }
      }

      setShipmentItems(mappedShipments)
      setRouteItems(mappedRoutes)
      setArchivedDeliveryPostsCount(archivedDeliveryRows.length)
      setArchivedAvailabilityPostsCount(archivedAvailabilityRows.length)
      setReceivedInvitations(receivedRows)
      setSentInvitations(sentRows)
      setBaseNotifications(notificationRows)
      setReadNotificationIds(notificationRows.filter((row) => row.isRead).map((row) => row.id))

      if (receivedRows.length > 0) {
        setSelectedInvitationId((prev) => {
          const exists = receivedRows.some((row) => row.id === prev)
          return exists ? prev : receivedRows[0].id
        })
      } else {
        setSelectedInvitationId('')
      }
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to fetch dashboard data from database')
    }
  }

  useEffect(() => {
    const handleSettingsUpdated = (event) => {
      const nextLanguage = event?.detail?.language
      if (nextLanguage) {
        setUiLanguage(nextLanguage)
      }
    }

    window.addEventListener('settings:updated', handleSettingsUpdated)
    return () => window.removeEventListener('settings:updated', handleSettingsUpdated)
  }, [])

  // Hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'overview'
      setDetailView({ type: null, id: null })
      setActiveSection(hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    const bootstrapApiAndData = async () => {
      await discoverApiBaseUrl()
      if (cancelled) return
      await refreshDashboardData()
    }

    bootstrapApiAndData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void discoverApiBaseUrl()

    const userId = Number(user?.id)
    if (!Number.isFinite(userId) || userId <= 0) return

    const socket = io(getApiBaseUrl(), {
      transports: ['websocket'],
      query: { userId: String(userId) },
    })

    realtimeSocketRef.current = socket

    socket.on('new_notification', (payload) => {
      if (!payload || !payload.id) return

      setBaseNotifications((prev) => {
        const exists = prev.some((notification) => notification.id === payload.id)
        if (exists) return prev
        return [{ ...payload, isRead: false }, ...prev]
      })

      if (
        payload.eventType === 'invite_received'
        || payload.eventType === 'invite_accepted'
        || payload.eventType === 'invite_declined'
        || payload.eventType === 'invite_expired'
      ) {
        refreshDashboardData()
      }
    })

    socket.on('posts_updated', () => {
      refreshDashboardData()
    })

    socket.on('connect_error', () => {
      // Keep dashboard functional even if realtime channel is unavailable.
    })

    return () => {
      socket.disconnect()
      if (realtimeSocketRef.current === socket) {
        realtimeSocketRef.current = null
      }
    }
  }, [user?.id])

  // Event Handlers
  const handleLogout = () => {
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('token')
    router.push('/login')
  }

  const handleCreateShipment = () => {
    setShowShipmentModal(true)
  }

  const closeShipmentModal = () => {
    setShowShipmentModal(false)
    setShipmentFormData({
      itemName: '',
      origin: '',
      destination: '',
      weight: '',
      capacity: '',
      deliveryDate: '',
      dimensions: '',
      category: 'general',
      description: '',
      photo: '',
    })
  }

  const handleSubmitShipment = async () => {
    if (isSubmittingShipment) {
      console.warn('Already submitting, ignoring click')
      return
    }

    console.log('Starting delivery post submission with data:', shipmentFormData)

    if (!shipmentFormData.itemName || !shipmentFormData.origin || !shipmentFormData.destination || !shipmentFormData.weight || !shipmentFormData.capacity || !shipmentFormData.deliveryDate) {
      const msg = 'Please fill in all shipment details'
      console.warn('Validation failed:', msg)
      pushNotification(msg)
      return
    }

    const weightValue = parseNumericInput(shipmentFormData.weight)
    const volumeValue = parseNumericInput(shipmentFormData.capacity)

    console.log('Parsed values - Weight:', weightValue, 'Volume:', volumeValue)

    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      const msg = 'Weight must be a valid number greater than 0'
      console.warn('Weight validation failed:', msg, 'Value:', weightValue)
      pushNotification(msg)
      return
    }

    if (!Number.isFinite(volumeValue) || volumeValue <= 0) {
      const msg = 'Capacity/volume must be a valid number greater than 0'
      console.warn('Volume validation failed:', msg, 'Value:', volumeValue)
      pushNotification(msg)
      return
    }

    const token = getStoredToken()
    if (!token) {
      const msg = 'Please login again'
      console.error('No token found')
      pushNotification(msg)
      router.push('/login')
      return
    }

    const payload = {
      itemName: shipmentFormData.itemName,
      origin: shipmentFormData.origin,
      destination: shipmentFormData.destination,
      weight: Math.round(weightValue),
      volume: Math.round(volumeValue),
      deliveryDate: shipmentFormData.deliveryDate,
      itemCategory: shipmentFormData.category || 'general',
      description: shipmentFormData.description || '',
      preferredVehicleType: shipmentFormData.preferredVehicleType || null,
    }

    console.log('Sending payload to backend:', payload)

    try {
      setIsSubmittingShipment(true)
      const apiBaseUrl = await discoverApiBaseUrl()
      const apiUrl = `${apiBaseUrl}/posts/delivery`
      console.log('API URL:', apiUrl)
      
      const response = await axios.post(apiUrl, payload, {
        headers: { token },
        timeout: 15000,
      })

      console.log('Delivery post created successfully:', response.data)

      const createdId = response.data?.postId

      const newShipment = {
        id: createdId ? `SHP-DB-${createdId}` : `SHP-2024-${String(shipmentItems.length + 1).padStart(3, '0')}`,
        dbId: createdId || null,
        itemName: shipmentFormData.itemName,
        origin: shipmentFormData.origin,
        destination: shipmentFormData.destination,
        weight: shipmentFormData.weight,
        capacity: shipmentFormData.capacity,
        dimensions: shipmentFormData.dimensions || 'N/A',
        category: shipmentFormData.category,
        description: shipmentFormData.description || '',
        type: shipmentFormData.category,
        photo: shipmentFormData.photo,
        date: shipmentFormData.deliveryDate,
        status: 'posted',
        statusHistory: [{ status: 'posted', at: new Date().toISOString() }],
        ownerId: currentUserKey,
        ownerType: user?.userType || 'user',
        ownerName: user?.name || 'Current user',
      }

      setShipmentItems(prev => [newShipment, ...prev])
      pushNotification(`Delivery post created: ${newShipment.id}`)
      closeShipmentModal()
    } catch (error) {
      console.error('Error creating delivery post:', error)
      const message = error?.response?.data?.message || error?.message || 'Failed to create delivery post'
      console.error('Error message:', message)
      pushNotification(message)
    } finally {
      setIsSubmittingShipment(false)
    }
  }

  const handlePostRoute = (type = 'full_route') => {
    setRoutePostType(type)
    setFormData({ from: '', to: '', capacity: '', volume: '', vehicleCount: '1', vehicleAllocations: [createVehicleAllocationInput()], departure: '', availableCity: '', availabilityStartDate: '', availabilityEndDate: '' })
    setShowRouteModal(true)
  }

  const handleSubmitRoute = async () => {
    const totalCapacity = parseNumericInput(formData.capacity)
    const totalVolume = parseNumericInput(formData.volume)

    if (!Number.isFinite(totalCapacity) || totalCapacity <= 0) {
      pushNotification('Please fill in capacity')
      return
    }

    if (!Number.isFinite(totalVolume) || totalVolume <= 0) {
      pushNotification('Please fill in volume')
      return
    }

    const vehicleAllocationPayload = buildVehicleAllocationPayload(formData.vehicleAllocations, totalCapacity, totalVolume)
    if (vehicleAllocationPayload.error) {
      pushNotification(vehicleAllocationPayload.error)
      return
    }

    if (routePostType === 'full_route' && !formData.departure) {
      pushNotification('Please fill in all route details')
      return
    }

    if (routePostType === 'availability_only' && !formData.availableCity) {
      pushNotification('Please select your availability city')
      return
    }

    if (routePostType === 'availability_only' && (!formData.availabilityStartDate || !formData.availabilityEndDate)) {
      pushNotification('Please select availability start and end dates')
      return
    }

    if (routePostType === 'availability_only' && formData.availabilityStartDate > formData.availabilityEndDate) {
      pushNotification('Availability start date must be before or equal to end date')
      return
    }

    if (routePostType === 'full_route' && (!formData.from || !formData.to)) {
      pushNotification('Please select departure and destination wilayas')
      return
    }

    const token = getStoredToken()
    if (!token) {
      pushNotification('Please login again')
      router.push('/login')
      return
    }

    const routeOrigin = routePostType === 'availability_only' ? formData.availableCity : formData.from
    const routeDestination = routePostType === 'availability_only' ? formData.availableCity : formData.to

    const payload = {
      postType: routePostType,
      origin: routeOrigin,
      destination: routeDestination,
      availableCity: routePostType === 'availability_only'
        ? formData.availableCity
        : (formData.availableCity || routeDestination || routeOrigin),
      capacity: Math.round(totalCapacity),
      volume: Math.round(totalVolume),
      vehicleAllocation: vehicleAllocationPayload.vehicleAllocation,
      date: routePostType === 'full_route'
        ? formData.departure
        : buildAvailabilityDateIntervalValue(formData.availabilityStartDate, formData.availabilityEndDate),
      ...(routePostType === 'availability_only'
        ? {
            availabilityStartDate: formData.availabilityStartDate,
            availabilityEndDate: formData.availabilityEndDate,
          }
        : {}),
    }

    try {
      console.log('Creating availability payload', payload)
      const apiBaseUrl = await discoverApiBaseUrl()
      const response = await axios.post(`${apiBaseUrl}/posts/availability`, payload, {
        headers: { token },
        timeout: 15000,
      })

      console.log('Availability post created successfully:', response.data)
      const createdId = response.data?.postId
    
      const newRoute = {
        id: createdId ? `ROUTE-DB-${createdId}` : `ROUTE-${String(routeItems.length + 1).padStart(3, '0')}`,
        dbId: createdId || null,
        from: routeOrigin,
        to: routeDestination,
        capacity: formData.capacity,
        volume: formData.volume,
        available: formData.capacity,
        vehicleAllocation: vehicleAllocationPayload.vehicleAllocation,
        vehicleCount: vehicleAllocationPayload.vehicleAllocation.length,
        departure: routePostType === 'full_route'
          ? formData.departure
          : formatAvailabilityDateInterval(formData.availabilityStartDate, formData.availabilityEndDate),
        routeDateRaw: payload.date,
        availabilityStartDate: routePostType === 'availability_only' ? formData.availabilityStartDate : '',
        availabilityEndDate: routePostType === 'availability_only' ? formData.availabilityEndDate : '',
        postType: routePostType,
        availableCity: routePostType === 'availability_only'
          ? formData.availableCity
          : (formData.availableCity || routeDestination || routeOrigin),
        isLive: false,
        driverName: user?.name || 'Unknown driver',
        currentStop: '',
        ownerId: currentUserKey,
        ownerType: user?.userType || 'user',
        ownerName: user?.name || 'Current user',
      }

      setRouteItems(prev => [newRoute, ...prev])
      pushNotification(`${routePostType === 'full_route' ? 'Route' : 'Availability'} post created: ${newRoute.id}`)
      setShowRouteModal(false)
      setRoutePostType('full_route')
      setFormData({ from: '', to: '', capacity: '', volume: '', vehicleCount: '1', vehicleAllocations: [createVehicleAllocationInput()], departure: '', availableCity: '', availabilityStartDate: '', availabilityEndDate: '' })
    } catch (error) {
      console.error('Error creating availability post:', error)
      console.error('Error response:', error?.response?.data)
      console.error('Full error:', JSON.stringify(error, null, 2))
      pushNotification(error?.response?.data?.message || 'Failed to create availability post')
    }
  }

  const advanceShipmentStatus = (id) => {
    setShipmentItems(shipmentItems.map(item => {
      if (item.id === id) {
        const nextStatus = getNextShipmentStatus(item.status)
        if (!nextStatus) {
          pushNotification(`Shipment ${id} is already delivered`)
          return item
        }
        pushNotification(`Shipment ${id} status updated to ${nextStatus}`)
        return {
          ...item,
          status: nextStatus,
          statusHistory: [
            ...ensureShipmentStatusHistory(item),
            { status: nextStatus, at: new Date().toISOString() },
          ],
        }
      }
      return item
    }))
  }

  const deleteShipment = async (id) => {
    const targetShipment = shipmentItems.find((item) => item.id === id)
    if (!targetShipment) {
      pushNotification('Shipment not found')
      return
    }

    const shipmentDbId = resolveDbId(targetShipment.id, targetShipment.dbId)

    if (shipmentDbId) {
      const token = getStoredToken()
      if (!token) {
        pushNotification('Please login again')
        router.push('/login')
        return
      }

      try {
        await axios.delete(getApiUrl(`/posts/delivery/${shipmentDbId}`), {
          headers: {
            token,
            Authorization: `Bearer ${token}`,
          },
        })

        await refreshDashboardData()
      } catch (error) {
        pushNotification(error?.response?.data?.message || 'Failed to delete shipment post')
        return
      }
    } else {
      pushNotification('This post is not persisted in database and cannot be deleted there')
    }

    setShipmentItems((prev) => prev.filter((item) => item.id !== id))
    pushNotification(`Shipment ${id} deleted`)
  }

  const deleteRoute = async (id) => {
    const targetRoute = routeItems.find((item) => item.id === id)
    if (!targetRoute) {
      pushNotification('Route not found')
      return
    }

    const routeDbId = resolveDbId(targetRoute.id, targetRoute.dbId)

    if (routeDbId) {
      const token = getStoredToken()
      if (!token) {
        pushNotification('Please login again')
        router.push('/login')
        return
      }

      try {
        await axios.delete(getApiUrl(`/posts/availability/${routeDbId}`), {
          headers: {
            token,
            Authorization: `Bearer ${token}`,
          },
        })

        await refreshDashboardData()
      } catch (error) {
        pushNotification(error?.response?.data?.message || 'Failed to delete route post')
        return
      }
    } else {
      pushNotification('This post is not persisted in database and cannot be deleted there')
    }

    setRouteItems((prev) => prev.filter((item) => item.id !== id))
    pushNotification(`Route ${id} deleted`)
  }

  const updateShipmentPost = async (id, updates) => {
    const targetShipment = shipmentItems.find((item) => item.id === id)
    if (!targetShipment) {
      pushNotification('Shipment not found')
      return
    }

    const normalizedUpdates = {
      itemName: String(updates?.itemName || '').trim(),
      origin: String(updates?.origin || '').trim(),
      destination: String(updates?.destination || '').trim(),
      weight: String(updates?.weight || '').trim(),
      capacity: String(updates?.capacity || '').trim(),
      date: String(updates?.date || '').trim(),
      category: String(updates?.category || '').trim(),
      description: String(updates?.description || '').trim(),
    }

    if (!normalizedUpdates.itemName || !normalizedUpdates.origin || !normalizedUpdates.destination || !normalizedUpdates.weight || !normalizedUpdates.capacity || !normalizedUpdates.date) {
      pushNotification('Please complete all required shipment fields')
      return
    }

    if (!targetShipment.dbId) {
      setShipmentItems((prev) => prev.map((item) => (
        item.id === id
          ? {
              ...item,
              ...normalizedUpdates,
            }
          : item
      )))
      pushNotification(`Shipment ${id} updated`)
      return
    }

    const token = getStoredToken()
    if (!token) {
      pushNotification('Please login again')
      router.push('/login')
      return
    }

    const payload = {
      itemName: normalizedUpdates.itemName,
      origin: normalizedUpdates.origin,
      destination: normalizedUpdates.destination,
      weight: parseNumericInput(normalizedUpdates.weight),
      volume: parseNumericInput(normalizedUpdates.capacity),
      deliveryDate: normalizedUpdates.date,
      itemCategory: normalizedUpdates.category || 'general',
      description: normalizedUpdates.description || '',
    }

    try {
      await axios.put(getApiUrl(`/posts/delivery/${targetShipment.dbId}`), payload, {
        headers: { token },
      })

      setShipmentItems((prev) => prev.map((item) => (
        item.id === id
          ? {
              ...item,
              itemName: normalizedUpdates.itemName,
              origin: normalizedUpdates.origin,
              destination: normalizedUpdates.destination,
              weight: normalizedUpdates.weight,
              capacity: normalizedUpdates.capacity,
              date: normalizedUpdates.date,
              category: normalizedUpdates.category || item.category,
              description: normalizedUpdates.description,
            }
          : item
      )))

      pushNotification(`Shipment ${id} updated successfully`)
      await refreshDashboardData()
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to update shipment post')
    }
  }

  const updateRoutePost = async (id, updates) => {
    const targetRoute = routeItems.find((item) => item.id === id)
    if (!targetRoute) {
      pushNotification('Availability post not found')
      return
    }

    const normalizedUpdates = {
      postType: String(updates?.postType || targetRoute.postType || 'full_route').trim(),
      from: String(updates?.from || targetRoute.from || '').trim(),
      to: String(updates?.to || targetRoute.to || '').trim(),
      capacity: String(updates?.capacity || '').trim(),
      volume: String(updates?.volume || targetRoute.volume || '').trim(),
      vehicleAllocations: Array.isArray(updates?.vehicleAllocations) ? updates.vehicleAllocations : [],
      departure: String(updates?.departure || '').trim(),
      availableCity: String(updates?.availableCity || targetRoute.availableCity || '').trim(),
      availabilityStartDate: String(updates?.availabilityStartDate || targetRoute.availabilityStartDate || '').trim(),
      availabilityEndDate: String(updates?.availabilityEndDate || targetRoute.availabilityEndDate || '').trim(),
    }

    const totalCapacity = parseNumericInput(normalizedUpdates.capacity)
    const totalVolume = parseNumericInput(normalizedUpdates.volume)

    if (!Number.isFinite(totalCapacity) || totalCapacity <= 0) {
      pushNotification('Capacity is required')
      return
    }

    if (!Number.isFinite(totalVolume) || totalVolume <= 0) {
      pushNotification('Volume is required')
      return
    }

    const vehicleAllocationPayload = buildVehicleAllocationPayload(normalizedUpdates.vehicleAllocations, totalCapacity, totalVolume)
    if (vehicleAllocationPayload.error) {
      pushNotification(vehicleAllocationPayload.error)
      return
    }

    if (normalizedUpdates.postType === 'full_route' && (!normalizedUpdates.from || !normalizedUpdates.to || !normalizedUpdates.departure)) {
      pushNotification('Please complete route fields for full route post')
      return
    }

    if (normalizedUpdates.postType === 'availability_only' && !normalizedUpdates.availableCity) {
      pushNotification('Please select your availability city')
      return
    }

    if (normalizedUpdates.postType === 'availability_only' && (!normalizedUpdates.availabilityStartDate || !normalizedUpdates.availabilityEndDate)) {
      pushNotification('Please select availability start and end dates')
      return
    }

    if (normalizedUpdates.postType === 'availability_only' && normalizedUpdates.availabilityStartDate > normalizedUpdates.availabilityEndDate) {
      pushNotification('Availability start date must be before or equal to end date')
      return
    }

    if (normalizedUpdates.postType === 'full_route' && (!normalizedUpdates.from || !normalizedUpdates.to)) {
      pushNotification('Please select departure and destination wilayas')
      return
    }

    const routeOrigin = normalizedUpdates.postType === 'availability_only' ? normalizedUpdates.availableCity : normalizedUpdates.from
    const routeDestination = normalizedUpdates.postType === 'availability_only' ? normalizedUpdates.availableCity : normalizedUpdates.to

    if (!targetRoute.dbId) {
      setRouteItems((prev) => prev.map((item) => (
        item.id === id
          ? {
              ...item,
              postType: normalizedUpdates.postType,
              from: routeOrigin,
              to: routeDestination,
              capacity: normalizedUpdates.capacity,
              volume: normalizedUpdates.volume,
              available: normalizedUpdates.capacity,
              vehicleAllocation: vehicleAllocationPayload.vehicleAllocation,
              vehicleCount: vehicleAllocationPayload.vehicleAllocation.length,
              departure: normalizedUpdates.postType === 'availability_only'
                ? formatAvailabilityDateInterval(normalizedUpdates.availabilityStartDate, normalizedUpdates.availabilityEndDate)
                : (normalizedUpdates.departure || 'Flexible'),
              routeDateRaw: normalizedUpdates.postType === 'availability_only'
                ? buildAvailabilityDateIntervalValue(normalizedUpdates.availabilityStartDate, normalizedUpdates.availabilityEndDate)
                : (normalizedUpdates.departure || 'Flexible'),
              availabilityStartDate: normalizedUpdates.postType === 'availability_only' ? normalizedUpdates.availabilityStartDate : '',
              availabilityEndDate: normalizedUpdates.postType === 'availability_only' ? normalizedUpdates.availabilityEndDate : '',
              availableCity: normalizedUpdates.availableCity || routeDestination || routeOrigin,
            }
          : item
      )))
      pushNotification(`Availability post ${id} updated`)
      return
    }

    const token = getStoredToken()
    if (!token) {
      pushNotification('Please login again')
      router.push('/login')
      return
    }

    const payload = {
      postType: normalizedUpdates.postType,
      origin: routeOrigin,
      destination: routeDestination,
      availableCity: normalizedUpdates.availableCity || routeDestination || routeOrigin,
      capacity: Math.round(totalCapacity),
      volume: Math.round(totalVolume),
      vehicleAllocation: vehicleAllocationPayload.vehicleAllocation,
      date: normalizedUpdates.postType === 'availability_only'
        ? buildAvailabilityDateIntervalValue(normalizedUpdates.availabilityStartDate, normalizedUpdates.availabilityEndDate)
        : (normalizedUpdates.departure || 'Flexible'),
      ...(normalizedUpdates.postType === 'availability_only'
        ? {
            availabilityStartDate: normalizedUpdates.availabilityStartDate,
            availabilityEndDate: normalizedUpdates.availabilityEndDate,
          }
        : {}),
    }

    try {
      console.log('Updating availability payload', payload)
      await axios.put(getApiUrl(`/posts/availability/${targetRoute.dbId}`), payload, {
        headers: { token },
      })

      setRouteItems((prev) => prev.map((item) => (
        item.id === id
          ? {
              ...item,
              postType: payload.postType,
              from: payload.origin,
              to: payload.destination,
              capacity: String(payload.capacity),
              volume: String(payload.volume),
              available: String(payload.capacity),
              vehicleAllocation: payload.vehicleAllocation,
              vehicleCount: payload.vehicleAllocation.length,
              departure: payload.postType === 'availability_only'
                ? formatAvailabilityDateInterval(normalizedUpdates.availabilityStartDate, normalizedUpdates.availabilityEndDate)
                : payload.date,
              routeDateRaw: payload.date,
              availabilityStartDate: payload.postType === 'availability_only' ? normalizedUpdates.availabilityStartDate : '',
              availabilityEndDate: payload.postType === 'availability_only' ? normalizedUpdates.availabilityEndDate : '',
              availableCity: payload.availableCity,
            }
          : item
      )))

      pushNotification(`Availability post ${id} updated successfully`)
      await refreshDashboardData()
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to update availability post')
    }
  }

  const toggleShipmentDetails = (id) => {
    setDetailView({ type: 'shipment', id })
  }

  const toggleRouteDetails = (id) => {
    setDetailView({ type: 'route', id })
  }

  const closeDetailView = () => {
    setDetailView({ type: null, id: null })
  }

  const pushNotification = (payload, meta = {}) => {
    const text = typeof payload === 'string' ? payload : payload?.description || payload?.title || 'New notification'
    const title = typeof payload === 'string' ? text.split(':')[0] : (payload?.title || text.split(':')[0])

    const newNotification = {
      id: `NOT-${Date.now()}`,
      title,
      description: text,
      eventType: meta.eventType || payload?.eventType || 'system_notice',
      targetRole: meta.targetRole || payload?.targetRole || 'shared',
      deepLink: meta.deepLink || payload?.deepLink || null,
      invitationId: meta.invitationId || payload?.invitationId || null,
      linkedPostType: meta.linkedPostType || payload?.linkedPostType || null,
      linkedPostId: meta.linkedPostId || payload?.linkedPostId || null,
      revealedPhone: meta.revealedPhone || payload?.revealedPhone || null,
      action: meta.action || payload?.action || null,
    }

    setBaseNotifications(prev => [newNotification, ...prev])
    setTimeout(() => setBaseNotifications(prev => prev.filter(n => n.id !== newNotification.id)), 5000)
  }

  const handleClearNotifications = () => {
    const token = getStoredToken()
    if (token) {
      axios.delete(getApiUrl('/notifications/clear-all'), { headers: { token } }).catch(() => null)
    }

    // Clear all notifications from display
    setBaseNotifications([])
    setReadNotificationIds([])
  }

  const handleToggleNotifications = () => {
    setNotificationsOpen(prev => !prev)
  }

  const handleOpenSidebarNotifications = () => {
    setReadNotificationIds((prev) => {
      const allIds = notifications.map((notification) => notification.id)
      return Array.from(new Set([...prev, ...allIds]))
    })
  }

  const handleNotificationClick = (notification) => {
    if (!notification) return

    setNotificationsOpen(false)

    setReadNotificationIds((prev) => (
      prev.includes(notification.id) ? prev : [...prev, notification.id]
    ))

    if (notification.dbId) {
      const token = getStoredToken()
      if (token) {
        axios.patch(getApiUrl(`/notifications/${notification.dbId}/read`), {}, { headers: { token } }).catch(() => null)
      }
    }

    if (notification.deepLink) {
      if (notification.deepLink.invitationId) {
        setSelectedInvitationId(notification.deepLink.invitationId)
      }

      if (notification.deepLink.section) {
        setActiveSection(notification.deepLink.section)
      }

      if (typeof window !== 'undefined') {
        window.location.assign(`#${notification.deepLink.section || 'overview'}`)
      }

      if (notification.deepLink.detailType && notification.deepLink.detailId) {
        setTimeout(() => {
          setDetailView({
            type: notification.deepLink.detailType,
            id: notification.deepLink.detailId,
          })
        }, 0)
      }
    }

    const dialPhone = getDialablePhone(notification?.action?.phone || notification?.revealedPhone)
    const canCallNow = notification?.eventType === 'invite_accepted' && Boolean(dialPhone)

    if (canCallNow && typeof window !== 'undefined') {
      window.location.href = `tel:${dialPhone}`
    }
  }

  const handleNotificationCallClick = (event, notification) => {
    event.stopPropagation()
    handleNotificationClick(notification)
  }

  const handleOpenSettings = () => {
    setUserMenuOpen(false)
    setActiveSection('settings')
    if (typeof window !== 'undefined') {
      window.location.assign('#settings')
    }
  }

  const handleUserProfileUpdate = (nextUserProfile) => {
    if (!nextUserProfile) return

    setUser((prev) => {
      const merged = { ...prev, ...nextUserProfile }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(merged))
      }
      return merged
    })
  }

  const isInvitationSent = (source, referenceId) => Boolean(sentInvitationKeys[getInvitationKey(source, referenceId)])

  const resolveInvitationPayload = (target, source, contextPost = null) => {
    if (!target) return null

    const targetRecipientUserId = Number(target?.ownerDbId)
    const hasTargetRecipient = Number.isFinite(targetRecipientUserId) && targetRecipientUserId > 0

    if (source === 'route') {
      const linkedShipment = contextPost?.dbId ? contextPost : null
      if (!linkedShipment || !target.dbId) return null
      return {
        availabilityPostId: target.dbId,
        deliveryPostId: linkedShipment.dbId,
        targetPostType: 'availability',
        targetPostId: target.dbId,
      }
    }

    if (source === 'community_shipment') {
      if (!target.dbId) return null

      const inviterShipment = contextPost?.dbId ? contextPost : null

      if (!inviterShipment) {
        return {
          ...(hasTargetRecipient ? { recipientUserId: targetRecipientUserId } : {}),
          targetPostType: 'delivery',
          targetPostId: target.dbId,
        }
      }

      return {
        availabilityPostId: target.dbId,
        deliveryPostId: inviterShipment.dbId,
        targetPostType: 'availability',
        targetPostId: target.dbId,
      }
    }

    if (source === 'community_route') {
      if (!target.dbId) return null

      const inviterRoute = contextPost?.dbId ? contextPost : null

      if (!inviterRoute) {
        return {
          ...(hasTargetRecipient ? { recipientUserId: targetRecipientUserId } : {}),
          targetPostType: 'availability',
          targetPostId: target.dbId,
        }
      }

      return {
        availabilityPostId: inviterRoute.dbId,
        deliveryPostId: target.dbId,
        targetPostType: 'delivery',
        targetPostId: target.dbId,
      }
    }

    if (source === 'route_relevant_shipment') {
      const linkedRoute = contextPost?.dbId ? contextPost : null
      if (!linkedRoute || !target.dbId) return null
      return {
        availabilityPostId: linkedRoute.dbId,
        deliveryPostId: target.dbId,
        targetPostType: 'delivery',
        targetPostId: target.dbId,
      }
    }

    return null
  }

  useEffect(() => {
    const handleUserUpdated = (event) => {
      if (event?.detail) {
        handleUserProfileUpdate(event.detail)
      }
    }

    window.addEventListener('user:updated', handleUserUpdated)
    return () => window.removeEventListener('user:updated', handleUserUpdated)
  }, [])

  const contactShipper = async (target, source = 'general', contextPost = null) => {
    const referenceId = typeof target === 'string' ? target : target?.id
    if (!referenceId) {
      pushNotification('No compatible post found to invite right now')
      return
    }

    const token = getStoredToken()
    if (!token) {
      pushNotification('Please login again')
      router.push('/login')
      return
    }

    const payload = resolveInvitationPayload(target, source, contextPost)
    if (!payload) {
      pushNotification('No compatible post found to invite right now')
      return
    }

    try {
      const response = await axios.post(getApiUrl('/invitations'), payload, { headers: { token } })
      pushNotification(response?.data?.message || `Invitation sent: ${referenceId}`, {
        eventType: 'invite_sent',
        targetRole: source === 'route' ? 'trucker' : 'shipper',
        deepLink: { section: 'matching' },
      })
      await refreshDashboardData()
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to send invitation')
    }
  }

  const handleAcceptLoad = (matchItem) => {
    if (!matchItem?.id) return

    const wasAlreadyAccepted = matchingItems.some(item => item.id === matchItem.id && item.accepted)
    if (!wasAlreadyAccepted) {
      setMatchingItems(prev =>
        prev.map(item =>
          item.id === matchItem.id
            ? {
                ...item,
                accepted: true,
                acceptedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              }
            : item
        )
      )
      pushNotification(`Load accepted: ${matchItem.id}`, {
        eventType: 'invite_accepted',
        targetRole: 'trucker',
        deepLink: { section: 'matching' },
      })
    }

    contactShipper(matchItem, 'match')
  }

  const handleSelectInvitation = (invitationId) => {
    setSelectedInvitationId(invitationId)
  }

  const handleAcceptReceivedInvitation = async (invitationId) => {
    const token = getStoredToken()
    const dbInvitationId = Number(String(invitationId).replace('INV-', ''))

    if (!token || !dbInvitationId) {
      pushNotification('Invalid invitation or expired session')
      return
    }

    try {
      const response = await axios.post(
        getApiUrl(`/invitations/${dbInvitationId}/accept`),
        {},
        { headers: { token } }
      )
      const revealedPhone = response?.data?.revealToRecipient
      pushNotification(
        revealedPhone
          ? `Invitation accepted. Call: ${revealedPhone}`
          : `Invitation accepted: ${invitationId}`,
        {
          eventType: 'invite_accepted',
          targetRole: 'shared',
          invitationId,
          deepLink: { section: 'matching', invitationId },
        }
      )
      await refreshDashboardData()
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to accept invitation')
    }
  }

  const handleDeclineReceivedInvitation = async (invitationId) => {
    const token = getStoredToken()
    const dbInvitationId = Number(String(invitationId).replace('INV-', ''))

    if (!token || !dbInvitationId) {
      pushNotification('Invalid invitation or expired session')
      return
    }

    try {
      await axios.post(
        getApiUrl(`/invitations/${dbInvitationId}/decline`),
        {},
        { headers: { token } }
      )
      pushNotification(`Invitation declined: ${invitationId}`, {
        eventType: 'invite_declined',
        targetRole: 'shared',
        invitationId,
        deepLink: { section: 'matching', invitationId },
      })
      await refreshDashboardData()
    } catch (error) {
      pushNotification(error?.response?.data?.message || 'Failed to decline invitation')
    }
  }

  // Helper: Check if wilaya is on the route (explicit waypoint or within 30km)
  const isWilayaOnRoute = (wilayaName, routeOrigin, routeDestination) => {
    const normalizedWilaya = normalizeWilayaName(wilayaName)
    if (!normalizedWilaya) return false
    
    const waypoints = getRouteWaypoints(routeOrigin, '', routeDestination)
    const normalizedWaypoints = waypoints.map((value) => normalizeWilayaName(value))
    
    // Check if it's an explicit waypoint
    if (normalizedWaypoints.includes(normalizedWilaya)) return true
    
    // Check if it's geographically close to the route (within 30km)
    const wilayaPoint = getWilayaPoint(wilayaName)
    const routeFromPoint = getWilayaPoint(routeOrigin)
    const routeToPoint = getWilayaPoint(routeDestination)
    
    if (wilayaPoint && routeFromPoint && routeToPoint) {
      const distance = getDistancePointToSegmentKm(wilayaPoint, routeFromPoint, routeToPoint)
      return distance <= 30
    }
    
    return false
  }

  // Helper: Check whether a wilaya sits on the selected route corridor path
  const wilayaFallsOnRouteCorridor = (wilayaName, corridorFrom, corridorTo) => {
    const wilayaPoint = getWilayaPoint(wilayaName)
    if (!wilayaPoint) return false

    const corridorPathNames = getShortestWilayaPathNames(corridorFrom, corridorTo)
    if (!corridorPathNames.length) return false

    const normalizedWilaya = normalizeWilayaName(wilayaName)
    const normalizedCorridorNames = corridorPathNames.map((name) => normalizeWilayaName(name))
    if (normalizedCorridorNames.includes(normalizedWilaya)) return true

    const corridorPoints = corridorPathNames
      .map((name) => getWilayaPoint(name))
      .filter(Boolean)

    if (corridorPoints.length < 2) return false

    let nearestDistance = Infinity
    let nearestSignedOffset = 0

    for (let index = 0; index < corridorPoints.length - 1; index += 1) {
      const segmentStart = corridorPoints[index]
      const segmentEnd = corridorPoints[index + 1]
      const segmentDistance = getDistancePointToSegmentKm(wilayaPoint, segmentStart, segmentEnd)

      const referenceLat = (segmentStart.lat + segmentEnd.lat) / 2
      const projectedPoint = projectToLocalKm(wilayaPoint, referenceLat)
      const projectedStart = projectToLocalKm(segmentStart, referenceLat)
      const projectedEnd = projectToLocalKm(segmentEnd, referenceLat)
      const segmentX = projectedEnd.x - projectedStart.x
      const segmentY = projectedEnd.y - projectedStart.y
      const pointX = projectedPoint.x - projectedStart.x
      const pointY = projectedPoint.y - projectedStart.y
      const signedOffset = (segmentX * pointY) - (segmentY * pointX)

      if (segmentDistance < nearestDistance) {
        nearestDistance = segmentDistance
        nearestSignedOffset = signedOffset
      }
    }

    return nearestDistance <= 80 && nearestSignedOffset <= 0
  }

  // Helper: Check if a post fits the selected corridor path (bidirectional: wilaya1→wilaya2 OR wilaya2→wilaya1)
  const postFitsBetweenWilayas = (postOrigin, postDestination, wilaya1, wilaya2, availableCity = '') => {
    // Check direction 1: wilaya1 → wilaya2
    const originBetween1 = wilayaFallsOnRouteCorridor(postOrigin, wilaya1, wilaya2)
    const destinationBetween1 = wilayaFallsOnRouteCorridor(postDestination, wilaya1, wilaya2)
    const availableCityBetween1 = !availableCity || wilayaFallsOnRouteCorridor(availableCity, wilaya1, wilaya2)
    const matchesDirection1 = originBetween1 && destinationBetween1 && availableCityBetween1

    // Check direction 2: wilaya2 → wilaya1 (reverse)
    const originBetween2 = wilayaFallsOnRouteCorridor(postOrigin, wilaya2, wilaya1)
    const destinationBetween2 = wilayaFallsOnRouteCorridor(postDestination, wilaya2, wilaya1)
    const availableCityBetween2 = !availableCity || wilayaFallsOnRouteCorridor(availableCity, wilaya2, wilaya1)
    const matchesDirection2 = originBetween2 && destinationBetween2 && availableCityBetween2

    // Match if either direction matches (aller et retour)
    return matchesDirection1 || matchesDirection2
  }

  const matchesPostFilters = (item, config) => {
    const {
      originFilterValue,
      destinationFilterValue,
      wilayaFiltersValue = [],
      corridorOriginFilterValue,
      corridorDestinationFilterValue,
      betweenWilaya1FilterValue,
      betweenWilaya2FilterValue,
      capacityFilterValue,
      volumeFilterValue,
      vehicleTypeFilterValue = '',
      capacityComparator = 'lte',
      volumeComparator = 'lte',
      typeMatches = true,
      getOrigin,
      getDestination,
      getWaypoints,
      getCapacity,
      getVolume = null,
      getAvailableCity = null,
      corridorSegmentValue = '',
    } = config

    const normalizedOriginFilter = normalizeRouteText(originFilterValue)
    const normalizedDestinationFilter = normalizeRouteText(destinationFilterValue)
    const hasWilayaFilters = wilayaFiltersValue.length > 0
    const normalizedCorridorOriginFilter = normalizeRouteText(corridorOriginFilterValue)
    const normalizedCorridorDestinationFilter = normalizeRouteText(corridorDestinationFilterValue)
    const normalizedBetweenWilaya1Filter = normalizeWilayaName(betweenWilaya1FilterValue)
    const normalizedBetweenWilaya2Filter = normalizeWilayaName(betweenWilaya2FilterValue)
    const hasOriginFilter = Boolean(normalizedOriginFilter)
    const hasDestinationFilter = Boolean(normalizedDestinationFilter)
    const hasCorridorOriginFilter = Boolean(normalizedCorridorOriginFilter)
    const hasCorridorDestinationFilter = Boolean(normalizedCorridorDestinationFilter)
    const hasBetweenWilaya1Filter = Boolean(normalizedBetweenWilaya1Filter)
    const hasBetweenWilaya2Filter = Boolean(normalizedBetweenWilaya2Filter)
    const betweenWilayasFiltersActive = hasBetweenWilaya1Filter && hasBetweenWilaya2Filter
    const corridorFiltersActive = hasCorridorOriginFilter && hasCorridorDestinationFilter

    const originValue = getOrigin(item)
    const destinationValue = getDestination(item)
    const waypoints = getWaypoints(item)
    const normalizedWaypoints = waypoints.map((value) => normalizeWilayaName(value))
    const availableCityValue = getAvailableCity ? getAvailableCity(item) : null

    const originTextMatches = !hasOriginFilter || normalizeRouteText(originValue).includes(normalizedOriginFilter)
    const destinationTextMatches = !hasDestinationFilter || normalizeRouteText(destinationValue).includes(normalizedDestinationFilter)
    // Check if ANY of the selected wilayas is on the route (OR logic)
    const wilayaMatches = !hasWilayaFilters || wilayaFiltersValue.some((wilayaName) => isWilayaOnRoute(wilayaName, originValue, destinationValue))

    const corridorOriginTextMatches = !hasCorridorOriginFilter || normalizedWaypoints.includes(normalizedCorridorOriginFilter)
    const corridorDestinationTextMatches = !hasCorridorDestinationFilter || normalizedWaypoints.includes(normalizedCorridorDestinationFilter)

    const corridorMatches = corridorFiltersActive
      && (
        routeContainsRequestedSegment(corridorOriginFilterValue, corridorDestinationFilterValue, originValue, destinationValue)
        || routeCorridorMatchesRequestedSegment(corridorOriginFilterValue, corridorDestinationFilterValue, originValue, destinationValue, corridorSegmentValue)
      )

    const corridorGeometryMatches = corridorFiltersActive
      ? (corridorOriginTextMatches && corridorDestinationTextMatches) || corridorMatches
      : true

    // Between Wilayas filter: the post endpoints should fall inside the selected corridor
    const betweenWilayasMatches = betweenWilayasFiltersActive
      ? postFitsBetweenWilayas(originValue, destinationValue, betweenWilaya1FilterValue, betweenWilaya2FilterValue, availableCityValue)
      : true

    const geometryMatches = hasOriginFilter && hasDestinationFilter
      ? (originTextMatches && destinationTextMatches) || corridorMatches
      : originTextMatches && destinationTextMatches

    const numericCapacity = Number.parseFloat(getCapacity(item)) || 0
    const numericCapacityFilter = Number.parseFloat(capacityFilterValue)
    const capacityMatches = !capacityFilterValue || (
      capacityComparator === 'gte'
        ? numericCapacity > numericCapacityFilter
        : numericCapacity <= numericCapacityFilter
    )

    const numericVolume = Number.parseFloat(getVolume ? getVolume(item) : getCapacity(item)) || 0
    const numericVolumeFilter = Number.parseFloat(volumeFilterValue)
    const volumeMatches = !volumeFilterValue || (
      volumeComparator === 'gte'
        ? numericVolume > numericVolumeFilter
        : numericVolume <= numericVolumeFilter
    )

    const hasVehicleTypeFilters = Array.isArray(vehicleTypeFilterValue)
      ? vehicleTypeFilterValue.length > 0
      : Boolean(vehicleTypeFilterValue)
    const vehicleTypeMatches = !hasVehicleTypeFilters || routeHasVehicleType(item, vehicleTypeFilterValue)

    return geometryMatches && corridorGeometryMatches && betweenWilayasMatches && wilayaMatches && capacityMatches && volumeMatches && vehicleTypeMatches && typeMatches
  }

  // Section-level filters (shipments: mirror availability/route filters + corridor support)
  const filteredShipments = useMemo(
    () => shipmentItems.filter((item) =>
      postMatchesDateRange(item, postDateFilterStart, postDateFilterEnd, (post) => ({
        start: post.date,
        end: post.date,
      }))
      && matchesPostFilters(item, {
        originFilterValue: shipmentOriginFilter,
        destinationFilterValue: shipmentDestinationFilter,
        wilayaFiltersValue: shipmentWilayaFilters,
        corridorOriginFilterValue: shipmentCorridorOriginFilter,
        corridorDestinationFilterValue: shipmentCorridorDestinationFilter,
        betweenWilaya1FilterValue: shipmentBetweenWilaya1Filter,
        betweenWilaya2FilterValue: shipmentBetweenWilaya2Filter,
        capacityFilterValue: shipmentCapacityFilter,
        volumeFilterValue: shipmentVolumeFilter,
        getOrigin: (post) => post.origin,
        getDestination: (post) => post.destination,
        getWaypoints: (post) => getRouteWaypoints(post.origin, '', post.destination),
        getCapacity: (post) => post.capacity,
        getVolume: (post) => post.volume ?? post.capacity,
        getAvailableCity: null,
      }) && (!shipmentCategoryFilter || normalizeRouteText(item.category || item.type || item.itemCategory) === normalizeRouteText(shipmentCategoryFilter))),
    [shipmentItems, shipmentOriginFilter, shipmentDestinationFilter, shipmentWilayaFilters, shipmentCorridorOriginFilter, shipmentCorridorDestinationFilter, shipmentBetweenWilaya1Filter, shipmentBetweenWilaya2Filter, shipmentCategoryFilter, shipmentCapacityFilter, shipmentVolumeFilter, postDateFilterStart, postDateFilterEnd]
  )

  const filteredRoutes = useMemo(
    () => routeItems.filter((item) =>
      postMatchesDateRange(item, postDateFilterStart, postDateFilterEnd, (post) => {
        const isAvailabilityOnly = post.postType === 'availability_only'
        if (isAvailabilityOnly) {
          const interval = parseAvailabilityDateInterval(post.routeDateRaw || post.departure)
          return { start: interval.start, end: interval.end }
        }

        const routeDate = getDateKey(post.routeDateRaw || post.departure)
        return { start: routeDate, end: routeDate }
      })
      && matchesPostFilters(item, {
        originFilterValue: routeOriginFilter,
        destinationFilterValue: routeDestinationFilter,
        wilayaFiltersValue: routeWilayaFilters,
        corridorOriginFilterValue: routeCorridorOriginFilter,
        corridorDestinationFilterValue: routeCorridorDestinationFilter,
        betweenWilaya1FilterValue: routeBetweenWilaya1Filter,
        betweenWilaya2FilterValue: routeBetweenWilaya2Filter,
        capacityFilterValue: routeCapacityFilter,
        volumeFilterValue: routeVolumeFilter,
        vehicleTypeFilterValue: routeVehicleTypeFilters,
        capacityComparator: 'gte',
        volumeComparator: 'gte',
        typeMatches:
          routeTypeFilter === 'all'
          || (routeTypeFilter === 'availability_only' && item.postType === 'availability_only')
          || (routeTypeFilter === 'full_route' && item.postType === 'full_route'),
        getOrigin: (post) => post.from,
        getDestination: (post) => post.to,
        getWaypoints: (post) => getRouteWaypoints(post.from, post.availableCity, post.to),
        getCapacity: (post) => post.available,
        getVolume: (post) => post.volume ?? post.available,
        getAvailableCity: (post) => post.availableCity,
        corridorSegmentValue: item?.availableCity || '',
      })),
    [routeItems, routeOriginFilter, routeDestinationFilter, routeWilayaFilters, routeCorridorOriginFilter, routeCorridorDestinationFilter, routeBetweenWilaya1Filter, routeBetweenWilaya2Filter, routeCapacityFilter, routeVolumeFilter, routeVehicleTypeFilters, routeTypeFilter, postDateFilterStart, postDateFilterEnd]
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background p-2.5 sm:p-4 lg:py-5 lg:px-8 xl:px-10 gap-3 sm:gap-4 lg:gap-5">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-in fade-in" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 inset-y-0 w-[88vw] max-w-[280px] bg-secondary animate-in slide-in-from-left">
            <DashboardSidebar
              role={role}
              uiLanguage={uiLanguage}
              hasUnreadNotifications={hasUnreadNotifications}
              notificationsCount={notifications.length}
              onOpenNotifications={handleOpenSidebarNotifications}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col bg-secondary border border-border rounded-2xl overflow-hidden shadow-sm h-full">
        <DashboardSidebar
          role={role}
          uiLanguage={uiLanguage}
          hasUnreadNotifications={hasUnreadNotifications}
          notificationsCount={notifications.length}
          onOpenNotifications={handleOpenSidebarNotifications}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-card border border-border rounded-2xl shadow-sm">
        {/* Header */}
        <header className="bg-card border-b border-border px-3.5 sm:px-7 lg:px-9 xl:px-10 py-3 sm:py-4.5 lg:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="hidden md:flex items-center">
                <div className="relative flex items-center gap-4 px-1 py-1">
                  <span className="h-10 w-px bg-gradient-to-b from-sky-200/30 via-slate-400 to-sky-200/30" />
                  <div className="relative">
                    {/* <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold mb-1">
                      {tr(uiLanguage, 'Brand Slogan', 'Slogan de marque')}
                    </p> */}
                    <p className="text-sm lg:text-base font-semibold tracking-tight text-slate-900 leading-tight">
                      <span className="bg-gradient-to-r from-cyan-600 via-primary to-sky-700 bg-clip-text text-transparent">Connect</span> the right load to the right truck
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {hasUnreadNotifications && notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in fade-in slide-in-from-top duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{tr(uiLanguage, 'Notifications', 'Notifications')}</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearNotifications}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          {tr(uiLanguage, 'Clear all', 'Tout effacer')}
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-lg text-sm transition-colors cursor-pointer ${notif.isRead ? 'bg-muted/60 hover:bg-muted/70' : 'bg-muted hover:bg-muted/80'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-foreground ${notif.isRead ? 'font-medium' : 'font-semibold'}`}>{notif.title}</p>
                              {notif.isRead && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">{tr(uiLanguage, 'Read', 'Lu')}</span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs mt-1">{notif.description}</p>
                            {getDialablePhone(notif?.action?.phone || notif?.revealedPhone) && (
                              <button
                                type="button"
                                onClick={(event) => handleNotificationCallClick(event, notif)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                {tr(uiLanguage, 'Call now', 'Appeler maintenant')}
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground text-sm">{tr(uiLanguage, 'No notifications', 'Aucune notification')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary overflow-hidden flex items-center justify-center text-primary-foreground font-semibold text-xs sm:text-sm">
                    {user?.photo ? (
                      <img
                        src={user.photo}
                        alt={tr(uiLanguage, 'Profile photo', 'Photo de profil')}
                        className="w-full h-full"
                        style={{
                          objectFit: user.photoFit || 'fill',
                          transform: `translate(${user.photoOffsetX || 0}px, ${user.photoOffsetY || 0}px) scale(${user.photoScale || 1}) rotate(${user.photoRotation || 0}deg)`,
                        }}
                      />
                    ) : (
                      getUserInitial(user?.name)
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 sm:w-48 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top duration-200">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleOpenSettings}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      {tr(uiLanguage, 'Settings', 'Parametres')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      {tr(uiLanguage, 'Logout', 'Deconnexion')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-7 lg:p-10 xl:px-12 xl:py-11 space-y-6 sm:space-y-9 animate-in fade-in duration-500">
            
            {detailView.type ? (
              <PostDetailPage
                uiLanguage={uiLanguage}
                detailView={detailView}
                shipmentItems={shipmentItems}
                routeItems={routeItems}
                currentUserKey={currentUserKey}
                onClose={closeDetailView}
                advanceShipmentStatus={advanceShipmentStatus}
                deleteShipment={deleteShipment}
                deleteRoute={deleteRoute}
                onUpdateShipment={updateShipmentPost}
                onUpdateRoute={updateRoutePost}
                contactShipper={contactShipper}
                isInvitationSent={isInvitationSent}
              />
            ) : (
              <>
                {/* Overview Section */}
                {activeSection === 'overview' && (
                  <OverviewSection 
                    user={user} 
                    role={role} 
                    uiLanguage={uiLanguage}
                    shipmentItems={myShipmentItems}
                    routeItems={myRouteItems}
                    receivedInvitations={receivedInvitations}
                    archivedDeliveryPostsCount={archivedDeliveryPostsCount}
                    archivedAvailabilityPostsCount={archivedAvailabilityPostsCount}
                  />
                )}

                {/* Shipments Section */}
                {activeSection === 'shipments' && (
                  <ShipmentsSection
                    uiLanguage={uiLanguage}
                    filteredShipments={filteredShipments}
                    routeItems={routeItems}
                    isInvitationSent={isInvitationSent}
                    currentUserKey={currentUserKey}
                    postDateFilterStart={postDateFilterStart}
                    postDateFilterEnd={postDateFilterEnd}
                    shipmentOriginFilter={shipmentOriginFilter}
                    shipmentDestinationFilter={shipmentDestinationFilter}
                    shipmentWilayaFilters={shipmentWilayaFilters}
                    shipmentCategoryFilter={shipmentCategoryFilter}
                    shipmentCorridorOriginFilter={shipmentCorridorOriginFilter}
                    shipmentCorridorDestinationFilter={shipmentCorridorDestinationFilter}
                    shipmentBetweenWilaya1Filter={shipmentBetweenWilaya1Filter}
                    shipmentBetweenWilaya2Filter={shipmentBetweenWilaya2Filter}
                    shipmentCapacityFilter={shipmentCapacityFilter}
                    shipmentVolumeFilter={shipmentVolumeFilter}
                    setShipmentOriginFilter={setShipmentOriginFilter}
                    setShipmentDestinationFilter={setShipmentDestinationFilter}
                    setShipmentWilayaFilters={setShipmentWilayaFilters}
                    setShipmentCategoryFilter={setShipmentCategoryFilter}
                    setShipmentCorridorOriginFilter={setShipmentCorridorOriginFilter}
                    setShipmentCorridorDestinationFilter={setShipmentCorridorDestinationFilter}
                    setShipmentBetweenWilaya1Filter={setShipmentBetweenWilaya1Filter}
                    setShipmentBetweenWilaya2Filter={setShipmentBetweenWilaya2Filter}
                    setShipmentCapacityFilter={setShipmentCapacityFilter}
                    setShipmentVolumeFilter={setShipmentVolumeFilter}
                    setPostDateFilterStart={setPostDateFilterStart}
                    setPostDateFilterEnd={setPostDateFilterEnd}
                    advanceShipmentStatus={advanceShipmentStatus}
                    deleteShipment={deleteShipment}
                    contactShipper={contactShipper}
                    toggleShipmentDetails={toggleShipmentDetails}
                    handleCreateShipment={handleCreateShipment}
                  />
                )}

                {/* Routes Section */}
                {activeSection === 'routes' && (
                  <RoutesSection
                    uiLanguage={uiLanguage}
                    filteredRoutes={filteredRoutes}
                    shipmentItems={shipmentItems}
                    isInvitationSent={isInvitationSent}
                    currentUserKey={currentUserKey}
                    routeTypeFilter={routeTypeFilter}
                    setRouteTypeFilter={setRouteTypeFilter}
                    postDateFilterStart={postDateFilterStart}
                    postDateFilterEnd={postDateFilterEnd}
                    routeOriginFilter={routeOriginFilter}
                    routeDestinationFilter={routeDestinationFilter}
                    routeWilayaFilters={routeWilayaFilters}
                    routeCorridorOriginFilter={routeCorridorOriginFilter}
                    routeCorridorDestinationFilter={routeCorridorDestinationFilter}
                    routeBetweenWilaya1Filter={routeBetweenWilaya1Filter}
                    routeBetweenWilaya2Filter={routeBetweenWilaya2Filter}
                    routeCapacityFilter={routeCapacityFilter}
                    routeVolumeFilter={routeVolumeFilter}
                    routeVehicleTypeFilters={routeVehicleTypeFilters}
                    setRouteOriginFilter={setRouteOriginFilter}
                    setRouteDestinationFilter={setRouteDestinationFilter}
                    setRouteWilayaFilters={setRouteWilayaFilters}
                    setRouteCorridorOriginFilter={setRouteCorridorOriginFilter}
                    setRouteCorridorDestinationFilter={setRouteCorridorDestinationFilter}
                    setRouteBetweenWilaya1Filter={setRouteBetweenWilaya1Filter}
                    setRouteBetweenWilaya2Filter={setRouteBetweenWilaya2Filter}
                    setRouteCapacityFilter={setRouteCapacityFilter}
                    setRouteVolumeFilter={setRouteVolumeFilter}
                    setRouteVehicleTypeFilters={setRouteVehicleTypeFilters}
                    setPostDateFilterStart={setPostDateFilterStart}
                    setPostDateFilterEnd={setPostDateFilterEnd}
                    deleteRoute={deleteRoute}
                    contactShipper={contactShipper}
                    toggleRouteDetails={toggleRouteDetails}
                    handlePostRoute={handlePostRoute}
                  />
                )}

                {/* Matching Section */}
                {activeSection === 'matching' && (
                  <MatchingSection
                    uiLanguage={uiLanguage}
                    shipmentItems={myShipmentItems}
                    allShipmentItems={shipmentItems}
                    routeItems={myRouteItems}
                    allRouteItems={routeItems}
                    receivedInvitations={receivedInvitations}
                    selectedInvitationId={selectedInvitationId}
                    handleSelectInvitation={handleSelectInvitation}
                    handleAcceptReceivedInvitation={handleAcceptReceivedInvitation}
                    handleDeclineReceivedInvitation={handleDeclineReceivedInvitation}
                  />
                )}

                {/* Analytics Section */}
                {activeSection === 'analytics' && (
                  <AnalyticsSection
                    uiLanguage={uiLanguage}
                    shipmentItems={myShipmentItems}
                    routeItems={myRouteItems}
                    matchingItems={matchingItems}
                    receivedInvitations={receivedInvitations}
                  />
                )}

                {/* Notifications Section */}
                {activeSection === 'notifications' && (
                  <NotificationsSection
                    uiLanguage={uiLanguage}
                    notifications={notifications}
                    handleClearNotifications={handleClearNotifications}
                    onNotificationClick={handleNotificationClick}
                    onNotificationCall={handleNotificationCallClick}
                  />
                )}

                {/* Settings Section */}
                {activeSection === 'settings' && (
                  <SettingsSection
                    key={userSettingsStorageKey}
                    uiLanguage={uiLanguage}
                    onLanguagePreview={setUiLanguage}
                    user={user}
                    onUserUpdate={handleUserProfileUpdate}
                    pushNotification={pushNotification}
                    storageKey={userSettingsStorageKey}
                  />
                )}

                {/* Quick Match Section (Trucker) */}
                {activeSection === 'quick-match' && (
                  <QuickMatchSection
                    uiLanguage={uiLanguage}
                    matchingItems={matchingItems}
                    handleAcceptLoad={handleAcceptLoad}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Route Creation Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-3 py-4 sm:py-6">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-lg w-full max-w-[min(100vw-1.5rem,36rem)] sm:max-w-md lg:max-w-lg mx-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-foreground mb-2">{tr(uiLanguage, 'Create Post', 'Creer une publication')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{tr(uiLanguage, 'Choose ', 'Choisissez ')}<span className="font-semibold text-foreground">{tr(uiLanguage, 'Trucker - I am available', 'Transporteur - Je suis disponible')}</span>{tr(uiLanguage, ' and select the post type.', ' et selectionnez le type de publication.')}</p>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                onClick={() => setRoutePostType('full_route')}
                className={`rounded-md px-3 py-3 text-sm font-semibold transition-colors ${
                  routePostType === 'full_route' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'
                }`}
              >
                {tr(uiLanguage, 'Full Route', 'Trajet complet')}
              </button>
              <button
                onClick={() => setRoutePostType('availability_only')}
                className={`rounded-md px-3 py-3 text-sm font-semibold transition-colors ${
                  routePostType === 'availability_only' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'
                }`}
              >
                {tr(uiLanguage, 'Availability Only', 'Disponibilite uniquement')}
              </button>
            </div>
            
            <div className="space-y-4">
              {routePostType === 'full_route' && (
                <>
                  <WilayaSearch
                    label={tr(uiLanguage, 'From (City)', 'Depuis (Ville)')}
                    value={formData.from}
                    onChange={(nextValue) => setFormData({ ...formData, from: nextValue })}
                    placeholder={tr(uiLanguage, 'Search wilaya', 'Rechercher wilaya')}
                    required
                  />
                  
                  <WilayaSearch
                    label={tr(uiLanguage, 'To (City)', 'Vers (Ville)')}
                    value={formData.to}
                    onChange={(nextValue) => setFormData({ ...formData, to: nextValue })}
                    placeholder={tr(uiLanguage, 'Search wilaya', 'Rechercher wilaya')}
                    referenceWilaya={formData.from}
                    required
                  />
                </>
              )}

              {routePostType === 'availability_only' && (
                <WilayaSearch
                  label={tr(uiLanguage, 'Availability City', 'Ville de disponibilite')}
                  value={formData.availableCity}
                  onChange={(nextValue) => setFormData({ ...formData, availableCity: nextValue })}
                  placeholder={tr(uiLanguage, 'Search wilaya', 'Rechercher wilaya')}
                  required
                />
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Capacity (kg)', 'Capacite (kg)')}</label>
                <input
                  type="number"
                  placeholder={tr(uiLanguage, 'e.g., 3000', 'ex. 3000')}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Volume (m^3)', 'Volume (m^3)')}</label>
                <input
                  type="number"
                  placeholder={tr(uiLanguage, 'e.g., 12.5', 'ex. 12,5')}
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  step="0.1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Vehicle count', 'Nombre de vehicules')}</label>
                <div className="rounded-xl border border-border bg-muted/60 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{tr(uiLanguage, 'How many vehicles should split this capacity?', 'Combien de vehicules doivent se partager cette capacite ?')}</span>
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-background px-3 py-1 text-sm font-semibold text-foreground border border-border">
                      {formData.vehicleCount}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={Number(formData.vehicleCount) || 1}
                    onChange={(e) => {
                      const nextCount = Math.max(1, Math.floor(parseNumericInput(e.target.value) || 1))
                      setFormData((prev) => ({
                        ...prev,
                        vehicleCount: String(nextCount),
                        vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, nextCount),
                      }))
                    }}
                    className="w-full accent-[hsl(var(--primary))]"
                  />

                  <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    aria-label="Decrease vehicle count"
                    onClick={() => {
                      const current = Math.max(1, Math.floor(Number(formData.vehicleCount) || 1))
                      const next = Math.max(1, current - 1)
                      setFormData((prev) => ({
                        ...prev,
                        vehicleCount: String(next),
                        vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, next),
                      }))
                    }}
                    className="min-w-12 px-4 py-3 bg-card border border-border rounded-lg text-foreground hover:bg-card/80"
                  >-</button>

                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    placeholder={tr(uiLanguage, 'e.g., 3', 'ex. 3')}
                    value={formData.vehicleCount}
                    onChange={(e) => {
                      const nextCount = Math.max(1, Math.floor(parseNumericInput(e.target.value) || 1))
                      setFormData((prev) => ({
                        ...prev,
                        vehicleCount: String(nextCount),
                        vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, nextCount),
                      }))
                    }}
                    className="flex-1 min-w-0 text-center px-3 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    step="1"
                  />

                  <button
                    type="button"
                    aria-label="Increase vehicle count"
                    onClick={() => {
                      const current = Math.max(1, Math.floor(Number(formData.vehicleCount) || 1))
                      const next = current + 1
                      setFormData((prev) => ({
                        ...prev,
                        vehicleCount: String(next),
                        vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, next),
                      }))
                    }}
                    className="min-w-12 px-4 py-3 bg-card border border-border rounded-lg text-foreground hover:bg-card/80"
                  >+</button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">
                  {tr(uiLanguage, 'Split the total capacity and volume across the vehicles below. The sum must match the total capacity.', 'Repartissez la capacite et le volume totaux entre les vehicules ci-dessous. La somme doit correspondre a la capacite totale.')}
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {
                    // Preview distributed volumes based on current allocations and total volume
                    (() => {
                      const preview = buildVehicleAllocationPayload(formData.vehicleAllocations, parseNumericInput(formData.capacity), parseNumericInput(formData.volume))
                      const previewAllocations = (!preview || preview.error) ? [] : preview.vehicleAllocation
                      return formData.vehicleAllocations.map((allocationValue, index) => {
                        const previewEntry = previewAllocations[index] || {}
                        const previewVolumeLabel = previewEntry.volume != null ? formatVolumeM3(previewEntry.volume) : null
                        return (
                          <div key={`vehicle-allocation-${index}`} className="rounded-lg border border-border bg-background/80 p-3">
                            <label className="block text-xs font-medium text-muted-foreground mb-2">{tr(uiLanguage, `Vehicle ${index + 1}`, `Vehicule ${index + 1}`)}</label>
                            <div className="space-y-2">
                              <select
                                value={allocationValue.type}
                                onChange={(e) => {
                                  const nextType = e.target.value
                                  setFormData((prev) => ({
                                    ...prev,
                                    vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                      currentIndex === index ? { ...currentValue, type: nextType } : currentValue
                                    )),
                                  }))
                                }}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {VEHICLE_TYPE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{tr(uiLanguage, option.en, option.fr)}</option>
                                ))}
                              </select>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder={tr(uiLanguage, 'Capacity (kg)', 'Capacite (kg)')}
                                    value={allocationValue.capacity}
                                    onChange={(e) => {
                                      const nextValue = e.target.value
                                      setFormData((prev) => ({
                                        ...prev,
                                        vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                          currentIndex === index ? { ...currentValue, capacity: nextValue } : currentValue
                                        )),
                                      }))
                                    }}
                                    className="w-full px-3 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    step="1"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder={tr(uiLanguage, 'Volume (m^3)', 'Volume (m^3)')}
                                    value={allocationValue.volume}
                                    onChange={(e) => {
                                      const nextValue = e.target.value
                                      setFormData((prev) => ({
                                        ...prev,
                                        vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                          currentIndex === index ? { ...currentValue, volume: nextValue } : currentValue
                                        )),
                                      }))
                                    }}
                                    className="w-full px-3 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    step="0.1"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()
                  }
                </div>
              </div>

              {routePostType === 'full_route' ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Departure Date', 'Date de depart')}</label>
                  <input
                    type="date"
                    min={todayString}
                    value={formData.departure}
                    onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Available From', 'Disponible du')}</label>
                    <input
                      type="date"
                      min={todayString}
                      value={formData.availabilityStartDate}
                      onChange={(e) => setFormData({ ...formData, availabilityStartDate: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Available Until', 'Disponible jusqu au')}</label>
                    <input
                      type="date"
                      min={formData.availabilityStartDate || todayString}
                      value={formData.availabilityEndDate}
                      onChange={(e) => setFormData({ ...formData, availabilityEndDate: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {routePostType === 'availability_only' && (
                <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/60 px-3 py-2">
                  {tr(uiLanguage, 'This post will publish free capacity without enforcing a full route. You can optionally add route details later.', 'Cette publication affichera la capacite libre sans imposer un trajet complet. Vous pouvez ajouter les details du trajet plus tard.')}
                </p>
              )}
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRouteModal(false)
                  setRoutePostType('full_route')
                    setFormData({ from: '', to: '', capacity: '', volume: '', vehicleCount: '1', vehicleAllocations: [createVehicleAllocationInput()], departure: '', availableCity: '', availabilityStartDate: '', availabilityEndDate: '' })
                }}
                className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                {tr(uiLanguage, 'Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSubmitRoute}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {tr(uiLanguage, 'Post Availability', 'Publier la disponibilite')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment Creation Modal */}
      {showShipmentModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-6"
          onClick={closeShipmentModal}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-2xl w-full mx-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">{tr(uiLanguage, 'Create Post', 'Creer une publication')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{tr(uiLanguage, 'Choose ', 'Choisissez ')}<span className="font-semibold text-foreground">{tr(uiLanguage, 'Shipper - I need a delivery', 'Expediteur - J ai besoin d une livraison')}</span>{tr(uiLanguage, ' and specify origin, destination, cargo size, and date.', ' et indiquez l origine, la destination, le volume de la cargaison et la date.')}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Item Name', 'Nom de l article')}</label>
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'e.g., Queen bed frame', 'ex. Cadre de lit queen')}
                  value={shipmentFormData.itemName}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <WilayaSearch
                label={tr(uiLanguage, 'From (City)', 'Depuis (Ville)')}
                value={shipmentFormData.origin}
                onChange={(nextValue) => setShipmentFormData({ ...shipmentFormData, origin: nextValue })}
                placeholder={tr(uiLanguage, 'Search wilaya', 'Rechercher wilaya')}
                required
              />
              
              <WilayaSearch
                label={tr(uiLanguage, 'To (City)', 'Vers (Ville)')}
                value={shipmentFormData.destination}
                onChange={(nextValue) => setShipmentFormData({ ...shipmentFormData, destination: nextValue })}
                placeholder={tr(uiLanguage, 'Search wilaya', 'Rechercher wilaya')}
                referenceWilaya={shipmentFormData.origin}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Weight (kg)', 'Poids (kg)')}</label>
                <input
                  type="number"
                  placeholder={tr(uiLanguage, 'e.g., 1500', 'ex. 1500')}
                  value={shipmentFormData.weight}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Dimensions (m^3)', 'Dimensions (m^3)')}</label>
                <input
                  type="number"
                  placeholder={tr(uiLanguage, 'e.g., 5.5', 'ex. 5,5')}
                  step="0.1"
                  min="0"
                  value={shipmentFormData.capacity}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Delivery Date', 'Date de livraison')}</label>
                <input
                  type="date"
                  min={todayString}
                  value={shipmentFormData.deliveryDate}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Preferred Vehicle Type (optional)', 'Type de véhicule préféré (optionnel)')}</label>
                <select
                  value={shipmentFormData.preferredVehicleType || ''}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, preferredVehicleType: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{tr(uiLanguage, 'Any (No preference)', 'Tous (Pas de préférence)')}</option>
                  {VEHICLE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {tr(uiLanguage, option.en, option.fr)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Item Category', 'Categorie de l article')}</label>
                <select
                  value={shipmentFormData.category}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="general">{tr(uiLanguage, 'General Goods', 'Marchandises generales')}</option>
                  <option value="furniture">{tr(uiLanguage, 'Furniture', 'Meubles')}</option>
                  <option value="appliances">{tr(uiLanguage, 'Appliances', 'Appareils menagers')}</option>
                  <option value="fragile">{tr(uiLanguage, 'Fragile', 'Fragile')}</option>
                  <option value="perishable">{tr(uiLanguage, 'Perishable', 'Perissable')}</option>
                  <option value="hazardous">{tr(uiLanguage, 'Hazardous', 'Dangereux')}</option>
                  <option value="electronics">{tr(uiLanguage, 'Electronics', 'Electronique')}</option>
                  <option value="construction">{tr(uiLanguage, 'Construction Materials', 'Materiaux de construction')}</option>
                  <option value="other">{tr(uiLanguage, 'Other', 'Autre')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Description (optional)', 'Description (optionnelle)')}</label>
                <textarea
                  rows={3}
                  placeholder={tr(uiLanguage, 'Add handling notes (e.g., disassembled bed parts, fragile corners, stack limit).', 'Ajoutez des notes de manutention (ex. pieces de lit demontees, coins fragiles, limite d empilement).')}
                  value={shipmentFormData.description}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeShipmentModal}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                {tr(uiLanguage, 'Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSubmitShipment}
                disabled={isSubmittingShipment}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {isSubmittingShipment
                  ? tr(uiLanguage, 'Publishing...', 'Publication en cours...')
                  : tr(uiLanguage, 'Post Delivery Request', 'Publier la demande de livraison')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Overview Section Component
function OverviewSection({
  user,
  uiLanguage,
  shipmentItems,
  routeItems,
  receivedInvitations,
  archivedDeliveryPostsCount = 0,
  archivedAvailabilityPostsCount = 0,
}) {
  const overviewTitle = tr(uiLanguage, `Welcome back, ${user?.name}!`, `Bon retour, ${user?.name} !`, `  ${user?.name}!`)
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  

  const ownedShipmentIds = useMemo(() => new Set(shipmentItems.map((shipment) => shipment.id)), [shipmentItems])
  const ownedRouteIds = useMemo(() => new Set(routeItems.map((route) => route.id)), [routeItems])
  const visibleInvitations = useMemo(
    () => receivedInvitations.filter((invitation) => {
      if (invitation.linkedPostType === 'shipment') return ownedShipmentIds.has(invitation.linkedPostId)
      if (invitation.linkedPostType === 'route') return ownedRouteIds.has(invitation.linkedPostId)
      return false
    }),
    [receivedInvitations, ownedShipmentIds, ownedRouteIds],
  )

  const pendingInvitationsCount = useMemo(
    () => visibleInvitations.filter((invitation) => invitation.status === 'pending').length,
    [visibleInvitations],
  )

  const shipmentInvitationPostIds = useMemo(
    () => new Set(
      visibleInvitations
        .filter((invitation) => invitation.linkedPostType === 'shipment')
        .map((invitation) => invitation.linkedPostId),
    ),
    [visibleInvitations],
  )

  const routeInvitationPostIds = useMemo(
    () => new Set(
      visibleInvitations
        .filter((invitation) => invitation.linkedPostType === 'route')
        .map((invitation) => invitation.linkedPostId),
    ),
    [visibleInvitations],
  )

  const waitingClientPostsCount = useMemo(
    () => shipmentItems.filter((shipment) => shipment.status === 'posted' && !shipmentInvitationPostIds.has(shipment.id)).length,
    [shipmentItems, shipmentInvitationPostIds],
  )

  const waitingTruckerPostsCount = useMemo(
    () => routeItems.filter((route) => !routeInvitationPostIds.has(route.id)).length,
    [routeItems, routeInvitationPostIds],
  )

  const activeShipmentsCount = useMemo(
    () => shipmentItems.filter((shipment) => shipment.status !== 'delivered').length,
    [shipmentItems],
  )

  const myAvailabilityPostsCount = useMemo(() => routeItems.length, [routeItems])

  const priorityActions = [
    {
      id: 'priority-invitations',
      label: t('Review received invitations', 'Traiter les invitations recues', '  '),
      href: '#matching',
      state: pendingInvitationsCount > 0
        ? t('Attention required', 'Action requise', ' ')
        : t('Up to date', 'A jour', ''),
      stateTone: pendingInvitationsCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'priority-posts',
      label: t('Update your active delivery posts', 'Mettre a jour vos posts livraison actifs', '     '),
      href: '#shipments',
      state: activeShipmentsCount > 0
        ? t('Posts to manage', 'Posts a gerer', '  ')
        : t('No active post', 'Aucun post actif', '   '),
      stateTone: activeShipmentsCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-700',
    },
    {
      id: 'priority-availability',
      label: t('Update your availability posts', 'Mettre a jour vos posts disponibilite', '    '),
      href: '#routes',
      state: myAvailabilityPostsCount > 0
        ? t('Posts to manage', 'Posts a gerer', '  ')
        : t('No availability post', 'Aucun post disponibilite', '   '),
      stateTone: myAvailabilityPostsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700',
    },
  ]

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{overviewTitle}</h1>
          <p className="text-muted-foreground mt-1">
            {t('Simple control panel: manage invitations, match posts, and update your active posts quickly.', 'Panneau simple: gerez les invitations, faites les correspondances et mettez a jour vos publications actives rapidement.', ' :        .')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <AnalyticsCard title={t('Pending Invitations', 'Invitations en attente', ' ')} value={pendingInvitationsCount} change={pendingInvitationsCount > 0 ? t('Needs review now', 'A traiter maintenant', '  ') : t('No pending items', 'Aucun element en attente', '   ')} changeType={pendingInvitationsCount > 0 ? 'down' : 'up'} icon={<Bell className="w-5 h-5" />} />
        <AnalyticsCard title={t('Waiting (Client Posts)', 'En attente (posts client)', '  ( )')} value={waitingClientPostsCount} change={waitingClientPostsCount > 0 ? t('Open matching queue', 'Ouvrir la file matching', '  ') : t('No client post waiting', 'Aucun post client en attente', '    ')} changeType={waitingClientPostsCount > 0 ? 'down' : 'up'} icon={<Shield className="w-5 h-5" />} />
        <AnalyticsCard title={t('Waiting (Trucker Posts)', 'En attente (posts transporteur)', '  ( )')} value={waitingTruckerPostsCount} change={waitingTruckerPostsCount > 0 ? t('Check route matching', 'Verifier le matching des trajets', '   ') : t('No trucker post waiting', 'Aucun post transporteur en attente', '    ')} changeType={waitingTruckerPostsCount > 0 ? 'down' : 'up'} icon={<Truck className="w-5 h-5" />} />
        <AnalyticsCard title={t('Active Delivery Posts', 'Posts livraison actifs', '  ')} value={`${activeShipmentsCount} / ${archivedDeliveryPostsCount}`} change={t('Active / Archived', 'Actifs / Archives', '   ')} changeType="up" icon={<Package className="w-5 h-5" />} />
        <AnalyticsCard title={t('Availability Posts', 'Posts disponibilite', ' ')} value={`${myAvailabilityPostsCount} / ${archivedAvailabilityPostsCount}`} change={t('Active / Archived', 'Actifs / Archives', '   ')} changeType="up" icon={<Truck className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-foreground">{t('Priority Actions', 'Actions prioritaires', '  ')}</h2>
            <a href="#matching" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              {t('Open workspace', 'Ouvrir l espace de travail', '  ')}
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-2">
            {priorityActions.map((item) => (
              <a key={item.id} href={item.href} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold text-right ${item.stateTone}`}>{item.state}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">{t('Quick Actions', 'Actions rapides', ' ')}</h2>
          <div className="space-y-2">
            <a href="#shipments" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">{t('Create Delivery Post (I need a delivery)', 'Creer une publication livraison (j ai besoin d une livraison)', '   (  )')}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#routes" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">{t('Create Availability Post (I am available)', 'Creer une publication disponibilite (je suis disponible)', '   ( )')}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#matching" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">{t('Resolve Matching and Invitations', 'Resoudre les correspondances et invitations', '  ')}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#settings" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">{t('Open settings and save changes', 'Ouvrir les parametres et enregistrer', '   ')}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>

        </div>
      </div>

      
    </>
  )
}

// Shipments Section Component
function ShipmentsSection({
  uiLanguage,
  filteredShipments,
  routeItems,
  isInvitationSent,
  currentUserKey,
  postDateFilterStart,
  postDateFilterEnd,
  shipmentOriginFilter,
  shipmentDestinationFilter,
  shipmentWilayaFilters,
  shipmentCategoryFilter,
  shipmentCorridorOriginFilter,
  shipmentCorridorDestinationFilter,
  shipmentBetweenWilaya1Filter,
  shipmentBetweenWilaya2Filter,
  shipmentCapacityFilter,
  shipmentVolumeFilter,
  setShipmentOriginFilter,
  setShipmentDestinationFilter,
  setShipmentWilayaFilters,
  setShipmentCategoryFilter,
  setShipmentCorridorOriginFilter,
  setShipmentCorridorDestinationFilter,
  setShipmentBetweenWilaya1Filter,
  setShipmentBetweenWilaya2Filter,
  setShipmentCapacityFilter,
  setShipmentVolumeFilter,
  setPostDateFilterStart,
  setPostDateFilterEnd,
  advanceShipmentStatus,
  deleteShipment,
  contactShipper,
  toggleShipmentDetails,
  handleCreateShipment,
}) {
  const shipmentsTitle = tr(uiLanguage, 'Delivery Posts - I Need a Delivery', 'Demandes de livraison - J ai besoin d une livraison', '  -   ')
  const [shipmentViewScope, setShipmentViewScope] = useState('mine')
  const [showShipmentFilters, setShowShipmentFilters] = useState(false)

  const myShipments = filteredShipments.filter((shipment) => getPostOwnerKey(shipment) === currentUserKey)
  const communityShipments = filteredShipments.filter((shipment) => getPostOwnerKey(shipment) !== currentUserKey)
  const visibleShipments = shipmentViewScope === 'mine' ? myShipments : communityShipments

  const getBestRouteForShipment = (shipment) => {
    if (!shipment) return null

    const candidates = (routeItems || [])
      .filter((route) => route?.dbId)
      .filter((route) => getPostOwnerKey(route) !== getPostOwnerKey(shipment))
      .filter((route) => {
        const shipmentWeightValue = parseNumericInput(shipment.weight)
        const shipmentVolumeValue = parseNumericInput(shipment.volume ?? shipment.capacity)
        const routeCapacityValue = parseNumericInput(route.available ?? route.capacity)
        const routeVolumeValue = parseNumericInput(route.volume ?? route.available ?? route.capacity)

        if (!Number.isFinite(shipmentWeightValue) || !Number.isFinite(shipmentVolumeValue)) return false
        if (!Number.isFinite(routeCapacityValue) || !Number.isFinite(routeVolumeValue)) return false

        return routeCapacityValue >= shipmentWeightValue && routeVolumeValue >= shipmentVolumeValue
      })
      .map((route) => ({
        ...route,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: shipment.origin,
          shipmentDestination: shipment.destination,
          shipmentWeight: shipment.weight,
          shipmentVolume: shipment.volume ?? shipment.capacity,
          shipmentDate: shipment.date,
          routeFrom: route.from,
          routeTo: route.to,
          routeAvailable: route.available,
          routeVolume: route.volume ?? route.available ?? route.capacity,
          routeAvailableCity: route.availableCity,
          routeDeparture: route.routeDateRaw || route.departure,
          routePostType: route.postType,
        }),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    return candidates[0] || null
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{shipmentsTitle}</h1>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">{tr(uiLanguage, 'All Delivery Requests', 'Toutes les demandes de livraison', '  ')}</h2>
            {shipmentViewScope === 'mine' && myShipments.length > 0 && (
              <p className="text-sm font-bold text-muted-foreground mt-1">
                {tr(uiLanguage, '*Click on a post to see matches/relevant availability posts', '*Cliquez sur une publication pour voir les publications de disponibilites correspondantes', '*Cliquez sur une publication pour voir les publications de disponibilites correspondantes')}
              </p>
            )}
          </div>
          {shipmentViewScope === 'mine' ? (
            <button
              onClick={handleCreateShipment}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {tr(uiLanguage, 'Create Post', 'Creer une publication', ' ')}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {tr(uiLanguage, 'Viewing community posts', 'Affichage des publications communaute', '  ')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setShowShipmentFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {showShipmentFilters
              ? tr(uiLanguage, 'Hide filters', 'Masquer les filtres', ' ')
              : tr(uiLanguage, 'Show filters', 'Afficher les filtres', ' ')}
          </button>
        </div>
        {showShipmentFilters && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-5 mb-6">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Location & Route', 'Localisation et Trajet')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 gap-y-3 mb-4 items-start">
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'Search by departure city', 'Rechercher par ville de depart')}
                  value={shipmentOriginFilter}
                  onChange={(e) => setShipmentOriginFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10"
                />
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'Search by destination city', 'Rechercher par ville de destination')}
                  value={shipmentDestinationFilter}
                  onChange={(e) => setShipmentDestinationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10"
                />
                <WilayaSelectorMulti
                  label=""
                  values={shipmentWilayaFilters}
                  onChange={(nextValues) => setShipmentWilayaFilters(nextValues)}
                  placeholder={tr(uiLanguage, 'Passes by Wilayas', 'Passer par les Wilayas')}
                />
              </div>
              
              <div className="mb-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{tr(uiLanguage, 'Passes through the route', 'Passe par le trajet')}</p>
                  <p className="text-xs text-muted-foreground/80">{tr(uiLanguage, '(Must pass this route in this exact order)', '(Doit passer par ce trajet dans cet ordre exact)')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <WilayaSearch
                    label=""
                    value={shipmentCorridorOriginFilter}
                    onChange={(nextValue) => {
                      setShipmentCorridorOriginFilter(nextValue)
                      if (shipmentCorridorDestinationFilter) setShipmentCorridorDestinationFilter('')
                    }}
                    placeholder={tr(uiLanguage, 'Departure wilaya', 'Wilaya de depart')}
                  />
                  <WilayaSearch
                    label=""
                    value={shipmentCorridorDestinationFilter}
                    onChange={(nextValue) => setShipmentCorridorDestinationFilter(nextValue)}
                    placeholder={tr(uiLanguage, 'Destination wilaya', 'Wilaya de destination')}
                    referenceWilaya={shipmentCorridorOriginFilter}
                  />
                </div>
              </div>

              <div className="mb-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">{tr(uiLanguage, 'Between Wilayas', 'Entre deux Wilayas')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <WilayaSearch
                    label=""
                    value={shipmentBetweenWilaya1Filter}
                    onChange={(nextValue) => {
                      setShipmentBetweenWilaya1Filter(nextValue)
                      if (shipmentBetweenWilaya2Filter && !nextValue) setShipmentBetweenWilaya2Filter('')
                    }}
                    placeholder={tr(uiLanguage, 'First wilaya', 'Premiere wilaya')}
                  />
                  <WilayaSearch
                    label=""
                    value={shipmentBetweenWilaya2Filter}
                    onChange={(nextValue) => setShipmentBetweenWilaya2Filter(nextValue)}
                    placeholder={tr(uiLanguage, 'Second wilaya', 'Deuxieme wilaya')}
                    referenceWilaya={shipmentBetweenWilaya1Filter}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Cargo Details', 'Details de la Cargaison')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={shipmentCategoryFilter}
                    onChange={(e) => setShipmentCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">{tr(uiLanguage, 'All types', 'Tous les types')}</option>
                    <option value="general">{tr(uiLanguage, 'General Goods', 'Marchandises generales')}</option>
                    <option value="furniture">{tr(uiLanguage, 'Furniture', 'Meubles')}</option>
                    <option value="appliances">{tr(uiLanguage, 'Appliances', 'Appareils menagers')}</option>
                    <option value="fragile">{tr(uiLanguage, 'Fragile', 'Fragile')}</option>
                    <option value="perishable">{tr(uiLanguage, 'Perishable', 'Perissable')}</option>
                    <option value="hazardous">{tr(uiLanguage, 'Hazardous', 'Dangereux')}</option>
                    <option value="electronics">{tr(uiLanguage, 'Electronics', 'Electronique')}</option>
                    <option value="construction">{tr(uiLanguage, 'Construction Materials', 'Materiaux de construction')}</option>
                    <option value="other">{tr(uiLanguage, 'Other', 'Autre')}</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder={tr(uiLanguage, 'Max dim (m^3)', 'Dim max (m^3)')}
                    value={shipmentCapacityFilter}
                    onChange={(e) => setShipmentCapacityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={tr(uiLanguage, 'Max volume (m^3)', 'Volume max (m^3)')}
                    value={shipmentVolumeFilter}
                    onChange={(e) => setShipmentVolumeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Date Range', 'Plage de Dates')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={postDateFilterStart}
                    onChange={(e) => setPostDateFilterStart(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <input
                    type="date"
                    min={postDateFilterStart || ''}
                    value={postDateFilterEnd}
                    onChange={(e) => setPostDateFilterEnd(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <button
                onClick={() => {
                  setShipmentOriginFilter('')
                  setShipmentDestinationFilter('')
                  setShipmentWilayaFilters([])
                  setShipmentCategoryFilter('')
                  setShipmentCorridorOriginFilter('')
                  setShipmentCorridorDestinationFilter('')
                  setShipmentBetweenWilaya1Filter('')
                  setShipmentBetweenWilaya2Filter('')
                  setShipmentCapacityFilter('')
                  setShipmentVolumeFilter('')
                  setPostDateFilterStart('')
                  setPostDateFilterEnd('')
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {tr(uiLanguage, 'Clear Filters', 'Effacer les Filtres')}
              </button>
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setShipmentViewScope('mine')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${shipmentViewScope === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'My Posts', 'Mes publications', '')} ({myShipments.length})
          </button>
          <button
            onClick={() => setShipmentViewScope('community')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${shipmentViewScope === 'community' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'Community Posts', 'Publications de la communaute', ' ')} ({communityShipments.length})
          </button>
        </div>
        <div className="space-y-4">
          {visibleShipments.length > 0 ? (
            visibleShipments.map(shipment => (
              <ShipmentCard
                key={shipment.id}
                uiLanguage={uiLanguage}
                {...shipment}
                routeItems={routeItems}
                ownershipTag={shipmentViewScope === 'mine' ? 'My Post' : 'Community'}
                isReadOnly={shipmentViewScope === 'community'}
                showInvite={shipmentViewScope === 'community'}
                onInvite={shipmentViewScope === 'community'
                  ? () => {
                      contactShipper(shipment, 'community_shipment')
                    }
                  : undefined}
                inviteSent={shipmentViewScope === 'community'
                  ? (() => {
                      return isInvitationSent('community_shipment', shipment.id)
                    })()
                  : false}
                inviteDisabled={false}
                onStatusChange={() => advanceShipmentStatus(shipment.id)}
                onDelete={() => deleteShipment(shipment.id)}
                onToggleDetails={() => toggleShipmentDetails(shipment.id)}
                showDetails={false}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {shipmentViewScope === 'mine'
                  ? tr(uiLanguage, 'No personal shipment posts found', 'Aucune publication personnelle de livraison trouvee', '    ')
                  : tr(uiLanguage, 'No community shipment posts found', 'Aucune publication de livraison de la communaute trouvee', '     ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Routes Section Component
function RoutesSection({
  uiLanguage,
  filteredRoutes,
  shipmentItems,
  isInvitationSent,
  currentUserKey,
  routeTypeFilter,
  setRouteTypeFilter,
  postDateFilterStart,
  postDateFilterEnd,
  routeOriginFilter,
  routeDestinationFilter,
  routeWilayaFilters,
  routeCorridorOriginFilter,
  routeCorridorDestinationFilter,
  routeBetweenWilaya1Filter,
  routeBetweenWilaya2Filter,
  routeCapacityFilter,
  routeVolumeFilter,
  routeVehicleTypeFilters,
  setRouteOriginFilter,
  setRouteDestinationFilter,
  setRouteWilayaFilters,
  setRouteCorridorOriginFilter,
  setRouteCorridorDestinationFilter,
  setRouteBetweenWilaya1Filter,
  setRouteBetweenWilaya2Filter,
  setRouteCapacityFilter,
  setRouteVolumeFilter,
  setRouteVehicleTypeFilters,
  setPostDateFilterStart,
  setPostDateFilterEnd,
  deleteRoute,
  contactShipper,
  toggleRouteDetails,
  handlePostRoute,
}) {
  const routesTitle = tr(uiLanguage, 'Availability Posts - I am Available', 'Publications disponibilite - Je suis disponible', '  -  ')
  const [routeViewScope, setRouteViewScope] = useState('mine')
  const [showRouteFilters, setShowRouteFilters] = useState(false)

  const myRoutes = filteredRoutes.filter((route) => getPostOwnerKey(route) === currentUserKey)
  const communityRoutes = filteredRoutes.filter((route) => getPostOwnerKey(route) !== currentUserKey)
  const visibleRoutes = routeViewScope === 'mine' ? myRoutes : communityRoutes

  const getBestShipmentForRoute = (route) => {
    if (!route) return null

    const candidates = (shipmentItems || [])
      .filter((shipment) => shipment?.dbId)
      .filter((shipment) => getPostOwnerKey(shipment) !== getPostOwnerKey(route))
      .filter((shipment) => {
        const routeCapacityValue = parseNumericInput(route.available ?? route.capacity)
        const routeVolumeValue = parseNumericInput(route.volume ?? route.available ?? route.capacity)
        const shipmentWeightValue = parseNumericInput(shipment.weight)
        const shipmentVolumeValue = parseNumericInput(shipment.volume ?? shipment.capacity)

        if (!Number.isFinite(routeCapacityValue) || !Number.isFinite(routeVolumeValue)) return false
        if (!Number.isFinite(shipmentWeightValue) || !Number.isFinite(shipmentVolumeValue)) return false

        return routeCapacityValue >= shipmentWeightValue && routeVolumeValue >= shipmentVolumeValue
      })
      .map((shipment) => ({
        ...shipment,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: shipment.origin,
          shipmentDestination: shipment.destination,
          shipmentWeight: shipment.weight,
          shipmentVolume: shipment.volume ?? shipment.capacity,
          shipmentDate: shipment.date,
          routeFrom: route.from,
          routeTo: route.to,
          routeAvailable: route.available,
          routeVolume: route.volume ?? route.available ?? route.capacity,
          routeAvailableCity: route.availableCity,
          routeDeparture: route.routeDateRaw || route.departure,
          routePostType: route.postType,
        }),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)

    return candidates[0] || null
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{routesTitle}</h1>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">{tr(uiLanguage, 'All Trucker Posts', 'Toutes les publications des transporteurs', '   (  +  )')}</h2>
            {routeViewScope === 'mine' && myRoutes.length > 0 && (
              <p className="text-sm font-bold text-muted-foreground mt-1">
                {tr(uiLanguage, '*Click on a post to see matches/relevant delivery posts', '*Cliquez sur une publication pour voir les publications de livraisons correspondantes', '*Cliquez sur une publication pour voir les publications de livraisons correspondantes')}
              </p>
            )}
          </div>
          {routeViewScope === 'mine' ? (
            <button
              onClick={() => handlePostRoute('full_route')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {tr(uiLanguage, 'Create Post', 'Creer une publication', ' ')}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {tr(uiLanguage, 'Viewing community posts', 'Affichage des publications communaute', '  ')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setShowRouteFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {showRouteFilters
              ? tr(uiLanguage, 'Hide filters', 'Masquer les filtres', ' ')
              : tr(uiLanguage, 'Show filters', 'Afficher les filtres', ' ')}
          </button>
        </div>
        {showRouteFilters && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm space-y-5 mb-6">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Location & Route', 'Localisation et Trajet')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 gap-y-3 mb-4 items-start">
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'Search by departure city', 'Rechercher par ville de depart')}
                  value={routeOriginFilter}
                  onChange={(e) => setRouteOriginFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10"
                />
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'Search by destination city', 'Rechercher par ville de destination')}
                  value={routeDestinationFilter}
                  onChange={(e) => setRouteDestinationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10"
                />
                <WilayaSelectorMulti
                  label=""
                  values={routeWilayaFilters}
                  onChange={(nextValues) => setRouteWilayaFilters(nextValues)}
                  placeholder={tr(uiLanguage, 'Passes by Wilayas', 'Passer par les Wilayas')}
                />
              </div>
              
              <div className="mb-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{tr(uiLanguage, 'Passes through the route', 'Passe par le trajet')}</p>
                  <p className="text-xs text-muted-foreground/80">{tr(uiLanguage, '(Must pass this route in this exact order)', '(Doit passer par ce trajet dans cet ordre exact)')}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <WilayaSearch
                    label=""
                    value={routeCorridorOriginFilter}
                    onChange={(nextValue) => {
                      setRouteCorridorOriginFilter(nextValue)
                      if (routeCorridorDestinationFilter) setRouteCorridorDestinationFilter('')
                    }}
                    placeholder={tr(uiLanguage, 'Departure wilaya', 'Wilaya de depart')}
                  />
                  <WilayaSearch
                    label=""
                    value={routeCorridorDestinationFilter}
                    onChange={(nextValue) => setRouteCorridorDestinationFilter(nextValue)}
                    placeholder={tr(uiLanguage, 'Destination wilaya', 'Wilaya de destination')}
                    referenceWilaya={routeCorridorOriginFilter}
                  />
                </div>
              </div>

              <div className="mb-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">{tr(uiLanguage, 'Between Wilayas', 'Entre deux Wilayas')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  <WilayaSearch
                    label=""
                    value={routeBetweenWilaya1Filter}
                    onChange={(nextValue) => {
                      setRouteBetweenWilaya1Filter(nextValue)
                      if (routeBetweenWilaya2Filter && !nextValue) setRouteBetweenWilaya2Filter('')
                    }}
                    placeholder={tr(uiLanguage, 'First wilaya', 'Premiere wilaya')}
                  />
                  <WilayaSearch
                    label=""
                    value={routeBetweenWilaya2Filter}
                    onChange={(nextValue) => setRouteBetweenWilaya2Filter(nextValue)}
                    placeholder={tr(uiLanguage, 'Second wilaya', 'Deuxieme wilaya')}
                    referenceWilaya={routeBetweenWilaya1Filter}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Vehicle Details', 'Details du Vehicule')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="number"
                    min="0"
                    placeholder={tr(uiLanguage, 'Min capacity (kg)', 'Capacite min (kg)')}
                    value={routeCapacityFilter}
                    onChange={(e) => setRouteCapacityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder={tr(uiLanguage, 'Min volume (m^3)', 'Volume min (m^3)')}
                    value={routeVolumeFilter}
                    onChange={(e) => setRouteVolumeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <WilayaSelectorMulti
                    label=""
                    values={routeVehicleTypeFilters}
                    onChange={(nextValues) => setRouteVehicleTypeFilters(nextValues.slice(0, 5))}
                    placeholder={tr(uiLanguage, 'Search vehicle type', 'Rechercher type de vehicule')}
                    options={VEHICLE_TYPE_OPTIONS.map((option) => ({ id: option.value, name: tr(uiLanguage, option.en, option.fr) }))}
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">{tr(uiLanguage, 'Date Range', 'Plage de Dates')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={postDateFilterStart}
                    onChange={(e) => setPostDateFilterStart(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">-</span>
                  <input
                    type="date"
                    min={postDateFilterStart || ''}
                    value={postDateFilterEnd}
                    onChange={(e) => setPostDateFilterEnd(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <button
                onClick={() => {
                  setRouteOriginFilter('')
                  setRouteDestinationFilter('')
                  setRouteWilayaFilters([])
                  setRouteCorridorOriginFilter('')
                  setRouteCorridorDestinationFilter('')
                  setRouteBetweenWilaya1Filter('')
                  setRouteBetweenWilaya2Filter('')
                  setRouteCapacityFilter('')
                  setRouteVolumeFilter('')
                  setRouteVehicleTypeFilters([])
                  setRouteTypeFilter('all')
                  setPostDateFilterStart('')
                  setPostDateFilterEnd('')
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {tr(uiLanguage, 'Clear Filters', 'Effacer les Filtres')}
              </button>
            </div>
          </div>
        )}
        <div className="mb-5 flex flex-wrap gap-2 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setRouteTypeFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeTypeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'All', 'Tous', '')}
          </button>
          <button
            onClick={() => setRouteTypeFilter('availability_only')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeTypeFilter === 'availability_only' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'Availability only', 'Disponibilite seulement', ' ')}
          </button>
          <button
            onClick={() => setRouteTypeFilter('full_route')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeTypeFilter === 'full_route' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'Full route', 'Trajet complet', ' ')}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setRouteViewScope('mine')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeViewScope === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'My Posts', 'Mes publications', '')} ({myRoutes.length})
          </button>
          <button
            onClick={() => setRouteViewScope('community')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeViewScope === 'community' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'Community Posts', 'Publications de la communaute', ' ')} ({communityRoutes.length})
          </button>
        </div>
        <div className="space-y-4">
          {visibleRoutes.length > 0 ? (
            visibleRoutes.map(route => (
              <RouteCard
                key={route.id}
                uiLanguage={uiLanguage}
                {...route}
                shipmentItems={shipmentItems}
                ownershipTag={routeViewScope === 'mine' ? tr(uiLanguage, 'My Post', 'Ma publication', '') : tr(uiLanguage, 'Community', 'Communaute', '')}
                onDelete={routeViewScope === 'mine' ? () => deleteRoute(route.id) : undefined}
                onContact={routeViewScope === 'community'
                  ? () => {
                      contactShipper(route, 'community_route')
                    }
                  : undefined}
                contactSent={routeViewScope === 'community'
                  ? (() => {
                      return isInvitationSent('community_route', route.id)
                    })()
                  : false}
                contactDisabled={false}
                onContactRelevantShipment={routeViewScope === 'mine' ? (shipment) => contactShipper(shipment, 'route_relevant_shipment', route) : undefined}
                isRelevantShipmentInvitationSent={routeViewScope === 'mine' ? (shipmentId) => isInvitationSent('route_relevant_shipment', shipmentId) : undefined}
                onToggleDetails={() => toggleRouteDetails(route.id)}
                showDetails={false}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {routeViewScope === 'mine'
                  ? tr(uiLanguage, 'No personal route posts found', 'Aucune publication personnelle de trajet trouvee', '    ')
                  : tr(uiLanguage, 'No community route posts found', 'Aucune publication de trajet de la communaute trouvee', '     ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Matching Section Component
function MatchingSection({
  uiLanguage,
  shipmentItems,
  allShipmentItems,
  routeItems,
  allRouteItems,
  receivedInvitations,
  selectedInvitationId,
  handleSelectInvitation,
  handleAcceptReceivedInvitation,
  handleDeclineReceivedInvitation,
}) {
  const matchingTitle = tr(uiLanguage, 'Received Invitations', 'Invitations recues', ' ')
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [relevantRouteFilter, setRelevantRouteFilter] = useState('all')
  const ownedShipmentIds = useMemo(() => new Set(shipmentItems.map((shipment) => shipment.id)), [shipmentItems])
  const ownedRouteIds = useMemo(() => new Set(routeItems.map((route) => route.id)), [routeItems])
  const visibleInvitations = useMemo(
    () => receivedInvitations.filter((invitation) => {
      // Direct invitations (community) should always be visible
      if (invitation.direction === 'direct') return true
      // Regular post invitations - check if it's for one of user's posts
      if (invitation.linkedPostType === 'shipment') return ownedShipmentIds.has(invitation.linkedPostId)
      if (invitation.linkedPostType === 'route') return ownedRouteIds.has(invitation.linkedPostId)
      return false
    }),
    [receivedInvitations, ownedShipmentIds, ownedRouteIds],
  )
  const shipmentInvitations = useMemo(
    () => visibleInvitations.filter((invitation) => invitation.linkedPostType === 'shipment'),
    [visibleInvitations],
  )
  const routeInvitations = useMemo(
    () => visibleInvitations.filter((invitation) => invitation.linkedPostType === 'route'),
    [visibleInvitations],
  )
  const communityInvitations = useMemo(
    () => visibleInvitations.filter((invitation) => invitation.direction === 'direct'),
    [visibleInvitations],
  )
  const selectedInvitation = visibleInvitations.find((item) => item.id === selectedInvitationId) || null
  const linkedShipment = selectedInvitation?.linkedPostType === 'shipment'
    ? shipmentItems.find((shipment) => shipment.id === selectedInvitation.linkedPostId)
    : null
  const linkedRoute = selectedInvitation?.linkedPostType === 'route'
    ? routeItems.find((route) => route.id === selectedInvitation.linkedPostId)
    : null

  // Find sender's post
  const senderShipment = selectedInvitation?.senderPostType === 'shipment'
    ? (allShipmentItems || []).find((shipment) => shipment.id === selectedInvitation.senderPostId)
    : null
  const senderRoute = selectedInvitation?.senderPostType === 'route'
    ? (allRouteItems || []).find((route) => route.id === selectedInvitation.senderPostId)
    : null

  const isAcceptedAvailabilityOnlyRecipient = Boolean(
    selectedInvitation
    && selectedInvitation.status === 'accepted'
    && linkedRoute
    && linkedRoute.postType === 'availability_only'
  )

  const linkedShipmentRelevantRoutes = linkedShipment
    ? (allRouteItems || [])
      .map(route => ({
        ...route,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: linkedShipment.origin,
          shipmentDestination: linkedShipment.destination,
          shipmentWeight: linkedShipment.weight,
          shipmentDate: linkedShipment.date,
          routeFrom: route.from,
          routeTo: route.to,
          routeAvailable: route.available,
          routeAvailableCity: route.availableCity,
          routeDeparture: route.routeDateRaw || route.departure,
          routePostType: route.postType,
        }),
      }))
      .filter(route => !ownedRouteIds.has(route.id))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    : []

  const visibleLinkedShipmentRoutes = linkedShipment
    ? linkedShipmentRelevantRoutes
    : []

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{matchingTitle}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{tr(uiLanguage, 'Invitations from clients or truckers on your own posts.', 'Invitations des clients ou transporteurs sur vos propres publications.', '      .')}</p>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-foreground mb-5">{tr(uiLanguage, 'Received Invitations', 'Invitations recues', ' ')}</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Invitations For My Shipments', 'Invitations pour mes livraisons')}</p>
              {shipmentInvitations.length > 0 ? shipmentInvitations.map((invitation) => (
                <button
                  key={invitation.id}
                  onClick={() => handleSelectInvitation(invitation.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedInvitationId === invitation.id ? 'border-primary bg-primary/5' : 'border-border bg-muted hover:bg-muted/80'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{invitation.id}</p>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                      invitation.status === 'accepted' ? 'bg-green-100 text-green-700' : invitation.status === 'declined' ? 'bg-red-100 text-red-700' : invitation.status === 'expired' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {invitation.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('From', 'De')}: {invitation.senderRole === 'trucker' ? t('Trucker', 'Transporteur') : t('Client', 'Client')} - {invitation.senderName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{invitation.receivedAt}</p>
                </button>
              )) : (
                <p className="text-xs text-muted-foreground">{t('No shipment invitations.', 'Aucune invitation livraison.')}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Invitations For My Routes', 'Invitations pour mes trajets')}</p>
              {routeInvitations.length > 0 ? routeInvitations.map((invitation) => (
                <button
                  key={invitation.id}
                  onClick={() => handleSelectInvitation(invitation.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedInvitationId === invitation.id ? 'border-primary bg-primary/5' : 'border-border bg-muted hover:bg-muted/80'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{invitation.id}</p>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                      invitation.status === 'accepted' ? 'bg-green-100 text-green-700' : invitation.status === 'declined' ? 'bg-red-100 text-red-700' : invitation.status === 'expired' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {invitation.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('From', 'De')}: {invitation.senderRole === 'trucker' ? t('Trucker', 'Transporteur') : t('Client', 'Client')} - {invitation.senderName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{invitation.receivedAt}</p>
                </button>
              )) : (
                <p className="text-xs text-muted-foreground">{t('No route invitations.', 'Aucune invitation trajet.')}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('Community Invitations', 'Invitations de la communaute')}</p>
              {communityInvitations.length > 0 ? communityInvitations.map((invitation) => (
                <button
                  key={invitation.id}
                  onClick={() => handleSelectInvitation(invitation.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedInvitationId === invitation.id ? 'border-primary bg-primary/5' : 'border-border bg-muted hover:bg-muted/80'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{invitation.id}</p>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                      invitation.status === 'accepted' ? 'bg-green-100 text-green-700' : invitation.status === 'declined' ? 'bg-red-100 text-red-700' : invitation.status === 'expired' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {invitation.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('From', 'De')}: {invitation.senderName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{invitation.receivedAt}</p>
                </button>
              )) : (
                <p className="text-xs text-muted-foreground">{t('No community invitations.', 'Aucune invitation de communaute.')}</p>
              )}
            </div>

            {visibleInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('No invitations received on your posts.', 'Aucune invitation recue sur vos publications.')}</p>
            )}
          </div>

          <div className="xl:col-span-2 bg-muted rounded-lg border border-border p-5">
            {selectedInvitation ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t('Invitation details', 'Details de l invitation')}</p>
                      <p className="text-xs text-foreground mt-1">{selectedInvitation.id} {t('received at', 'recue a')} {selectedInvitation.receivedAt}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      selectedInvitation.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : selectedInvitation.status === 'declined'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedInvitation.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{selectedInvitation.message}</p>
                  <p className="text-sm text-foreground mt-2">
                    {selectedInvitation.linkedPostType === 'shipment'
                      ? t('You were invited for your post', 'Vous avez ete invite pour votre publication')
                      : t('You were invited for your post', 'Vous avez ete invite pour votre publication')}
                    {' '}<span className="font-semibold">{selectedInvitation.linkedPostId}</span>
                    {'. '}
                    {t('Invited by', 'Invite par')} <span className="font-semibold text-foreground">{selectedInvitation.senderName || t('Unknown sender', 'Invitant inconnu')}</span>.
                  </p>
                </div>

                {senderShipment && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">{t('Post from inviter', 'Publication de l invitant')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Post ID', 'ID publication')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.id}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Product', 'Produit')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.itemName || 'N/A'}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Departure city', 'Ville de depart')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.origin}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Destination city', 'Ville de destination')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.destination}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Weight', 'Poids')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.weight}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Date', 'Date')}</p>
                        <p className="font-medium text-foreground mt-1">{senderShipment.date}</p>
                      </div>
                    </div>
                  </div>
                )}

                {senderRoute && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">{t('Post from inviter', 'Publication de l invitant')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Post ID', 'ID publication')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.id}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('From', 'De')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.from}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('To', 'A')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.to}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Capacity', 'Capacite')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.capacity}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border md:col-span-2">
                        <p className="text-xs text-foreground">{t('Vehicles', 'Vehicules')}</p>
                        <p className="font-medium text-foreground mt-1">{formatVehicleAllocationSummary(senderRoute.vehicleAllocation, senderRoute.capacity)}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Departure', 'Depart')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.departure}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-foreground">{t('Driver', 'Conducteur')}</p>
                        <p className="font-medium text-foreground mt-1">{senderRoute.driverName}</p>
                      </div>
                    </div>
                  </div>
                )}

                {linkedShipment && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">{t('Your post (invited)', 'Votre publication (invitee)')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Post ID', 'ID publication')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.id}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Product', 'Produit')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.itemName || 'N/A'}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Departure city', 'Ville de depart')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.origin}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Destination city', 'Ville de destination')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.destination}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.weight}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Date', 'Date')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedShipment.date}</p>
                      </div>
                    </div>
                  </div>
                )}

                {linkedRoute && (
                  isAcceptedAvailabilityOnlyRecipient ? (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold text-foreground mb-3">{t('Your post (invited)', 'Votre publication (invitee)')}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{linkedRoute.id}</span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{t('Availability only', 'Disponibilite seulement')}</span>
                        <span className="text-muted-foreground">{t('City', 'Ville')}: <span className="text-foreground font-medium">{linkedRoute.availableCity || linkedRoute.from || t('N/A', 'N/A')}</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold text-foreground mb-3">{t('Your post (invited)', 'Votre publication (invitee)')}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs text-muted-foreground">{t('Post ID', 'ID publication')}</p>
                          <p className="font-medium text-foreground mt-1">{linkedRoute.id}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs text-muted-foreground">{t('Post type', 'Type de publication')}</p>
                          <p className="font-medium text-foreground mt-1">{linkedRoute.postType === 'availability_only' ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}</p>
                        </div>
                        {linkedRoute.postType === 'availability_only' ? (
                          <div className="rounded-lg bg-primary/10 p-3 border border-primary/20 md:col-span-2">
                            <p className="text-xs text-primary font-semibold">{t('Available city', 'Ville disponible')}</p>
                            <p className="font-medium text-foreground mt-1">{linkedRoute.availableCity || linkedRoute.from || t('N/A', 'N/A')}</p>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-lg bg-muted p-3 border border-border">
                              <p className="text-xs text-muted-foreground">Departure city</p>
                              <p className="font-medium text-foreground mt-1">{linkedRoute.from}</p>
                            </div>
                            <div className="rounded-lg bg-muted p-3 border border-border">
                              <p className="text-xs text-muted-foreground">Destination city</p>
                              <p className="font-medium text-foreground mt-1">{linkedRoute.to}</p>
                            </div>
                          </>
                        )}
                        <div className="rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}</p>
                          <p className="font-medium text-foreground mt-1">{formatWeightKg(linkedRoute.capacity)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                          <p className="font-medium text-foreground mt-1">{formatWeightKg(linkedRoute.available)}</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}</p>
                          <p className="font-medium text-foreground mt-1">{linkedRoute.driverName || t('Unknown driver', 'Conducteur inconnu')}</p>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {!linkedShipment && !linkedRoute && (
                  <p className="text-sm text-muted-foreground">{t('Linked post was not found.', 'Publication liee introuvable.')}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleAcceptReceivedInvitation(selectedInvitation.id)}
                    disabled={selectedInvitation.status !== 'pending'}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-70 ${
                      selectedInvitation.status === 'accepted'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : selectedInvitation.status === 'pending'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {selectedInvitation.status === 'accepted' ? t('Accepted', 'Accepte') : t('Accept', 'Accepter')}
                  </button>
                  <button
                    onClick={() => handleDeclineReceivedInvitation(selectedInvitation.id)}
                    disabled={selectedInvitation.status !== 'pending'}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-70 ${
                      selectedInvitation.status === 'declined'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : selectedInvitation.status === 'pending'
                        ? 'bg-muted text-foreground hover:bg-muted/80'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {selectedInvitation.status === 'declined' ? t('Declined', 'Refusee') : t('Decline', 'Refuser')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('Select an invitation to view details.', 'Selectionnez une invitation pour voir les details.')}</p>
            )}
          </div>
        </div>
      </div>

    </>
  )
}

// Analytics Section Component
function AnalyticsSection({ uiLanguage, shipmentItems, routeItems, matchingItems, receivedInvitations }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [periodFilter, setPeriodFilter] = useState('all')
  const [showHistory, setShowHistory] = useState(false)
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all')

  const getDateValue = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const cutoffDate = useMemo(() => {
    if (periodFilter === 'all') return null
    const days = Number.parseInt(periodFilter.replace('d', ''), 10)
    if (!days) return null
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return cutoff
  }, [periodFilter])

  const periodShipments = useMemo(
    () => shipmentItems.filter((shipment) => {
      if (!cutoffDate) return true
      const shipmentDate = getDateValue(shipment.date)
      return shipmentDate ? shipmentDate >= cutoffDate : false
    }),
    [shipmentItems, cutoffDate],
  )

  const periodRoutes = useMemo(
    () => routeItems.filter((route) => {
      if (!cutoffDate) return true
      const routeDate = getDateValue(route.departure)
      return routeDate ? routeDate >= cutoffDate : false
    }),
    [routeItems, cutoffDate],
  )

  const shipmentStatusCounts = useMemo(
    () => periodShipments.reduce(
      (acc, shipment) => {
        acc[shipment.status] = (acc[shipment.status] || 0) + 1
        return acc
      },
      { posted: 0, matched: 0, in_transit: 0, delivered: 0 },
    ),
    [periodShipments],
  )

  const routeMetrics = useMemo(
    () => periodRoutes.reduce(
      (acc, route) => {
        const capacity = Number.parseFloat(route.capacity || '0') || 0
        const available = Number.parseFloat(route.available || '0') || 0
        acc.totalCapacity += capacity
        acc.totalAvailable += available
        if (route.isLive) acc.liveRoutes += 1
        if (route.postType === 'full_route') acc.fullRoutes += 1
        if (route.postType === 'availability_only') acc.availabilityOnly += 1
        return acc
      },
      { totalCapacity: 0, totalAvailable: 0, liveRoutes: 0, fullRoutes: 0, availabilityOnly: 0 },
    ),
    [periodRoutes],
  )

  const invitationMetrics = useMemo(
    () => receivedInvitations.reduce(
      (acc, invitation) => {
        acc.total += 1
        acc[invitation.status] = (acc[invitation.status] || 0) + 1
        return acc
      },
      { total: 0, pending: 0, accepted: 0, declined: 0 },
    ),
    [receivedInvitations],
  )

  const matchingMetrics = useMemo(() => {
    const total = matchingItems.length
    const accepted = matchingItems.filter((item) => item.accepted).length
    const averageScore = total
      ? Math.round(matchingItems.reduce((sum, item) => sum + (item.percentage || 0), 0) / total)
      : 0

    return {
      total,
      accepted,
      acceptanceRate: total ? Math.round((accepted / total) * 100) : 0,
      averageScore,
    }
  }, [matchingItems])

  const shipmentHistory = useMemo(
    () => periodShipments
      .sort((a, b) => {
        const aTime = getDateValue(a.date)?.getTime() || 0
        const bTime = getDateValue(b.date)?.getTime() || 0
        return bTime - aTime
      }),
    [periodShipments],
  )

  const filteredShipmentHistory = useMemo(
    () => shipmentHistory.filter((shipment) => (
      historyStatusFilter === 'all' ? true : shipment.status === historyStatusFilter
    )),
    [shipmentHistory, historyStatusFilter],
  )

  const periodLabel =
    periodFilter === '7d'
      ? t('Last 7 days', '7 derniers jours')
      : periodFilter === '30d'
        ? t('Last 30 days', '30 derniers jours')
        : periodFilter === '90d'
          ? t('Last 90 days', '90 derniers jours')
          : t('All time', 'Toute la periode')

  const hasPeriodData = periodShipments.length > 0 || periodRoutes.length > 0



  const loadUtilization = routeMetrics.totalCapacity
    ? Math.round(((routeMetrics.totalCapacity - routeMetrics.totalAvailable) / routeMetrics.totalCapacity) * 100)
    : 0

  const statusBars = [
    { label: t('Posted', 'Publie'), value: shipmentStatusCounts.posted, color: 'bg-slate-500' },
    { label: t('Matched', 'Mis en relation'), value: shipmentStatusCounts.matched, color: 'bg-blue-500' },
    { label: t('In transit', 'En transit'), value: shipmentStatusCounts.in_transit, color: 'bg-amber-500' },
    { label: t('Delivered', 'Livre'), value: shipmentStatusCounts.delivered, color: 'bg-green-500' },
  ]

  const historyStatusStyles = {
    posted: 'bg-blue-50 text-blue-700 border-blue-200',
    matched: 'bg-green-50 text-green-700 border-green-200',
    in_transit: 'bg-amber-50 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const historyStatusLabels = {
    posted: t('Posted', 'Publie'),
    matched: t('Matched', 'Mis en relation'),
    in_transit: t('In Transit', 'En transit'),
    delivered: t('Delivered', 'Livre'),
  }

  const maxStatusValue = Math.max(...statusBars.map((bar) => bar.value), 1)

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold text-foreground">{tr(uiLanguage, 'Analytics', 'Analytiques', '')}</h1>
        <div className="flex items-center gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7d">{tr(uiLanguage, 'Last 7 days', '7 derniers jours', ' 7 ')}</option>
            <option value="30d">{tr(uiLanguage, 'Last 30 days', '30 derniers jours', ' 30 ')}</option>
            <option value="90d">{tr(uiLanguage, 'Last 90 days', '90 derniers jours', ' 90 ')}</option>
            <option value="all">{tr(uiLanguage, 'All time', 'Toute la periode', ' ')}</option>
          </select>

        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{t('Data window', 'Fenetre de donnees')}: {periodLabel}</p>

      {!hasPeriodData && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-amber-800">
            {t('No shipment or route data found for this period. Try another range or switch to All time.', 'Aucune donnee d expedition ou de trajet pour cette periode. Essayez une autre plage ou passez a Toute la periode.')}
          </p>
          <button
            onClick={() => setPeriodFilter('all')}
            className="px-3 py-1.5 rounded-md bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors text-xs font-semibold"
          >
            {t('Use All time', 'Utiliser Toute la periode')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Delivery Requests', 'Demandes de livraison')}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{periodShipments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{shipmentStatusCounts.delivered} {t('delivered', 'livrees')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Availability Posts', 'Publications de disponibilite')}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{periodRoutes.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{routeMetrics.liveRoutes} {t('currently live', 'actifs actuellement')}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Load Utilization', 'Utilisation de charge')}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{loadUtilization}%</p>
          <p className="text-xs text-muted-foreground mt-1">{routeMetrics.totalAvailable.toFixed(1)}t {t('free of', 'libres sur')} {routeMetrics.totalCapacity.toFixed(1)}t</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Match Quality', 'Qualite de matching')}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{matchingMetrics.averageScore}%</p>
          <p className="text-xs text-muted-foreground mt-1">{matchingMetrics.acceptanceRate}% {t('accepted', 'acceptes')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">{t('Shipment Status Distribution', 'Repartition des statuts d expedition')}</h2>
          <div className="space-y-4">
            {statusBars.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div 
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.value / maxStatusValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">{t('Full Routes', 'Trajets complets')}</p>
              <p className="text-lg font-bold text-foreground">{routeMetrics.fullRoutes}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">{t('Availability Only', 'Disponibilite seulement')}</p>
              <p className="text-lg font-bold text-foreground">{routeMetrics.availabilityOnly}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">{t('Invitation & Match Funnel', 'Entonnoir invitations et matching')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">{t('Total Invitations', 'Total des invitations')}</span>
              <span className="text-2xl font-bold text-primary">{invitationMetrics.total}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">{t('Pending Invitations', 'Invitations en attente')}</span>
              <span className="text-2xl font-bold text-amber-600">{invitationMetrics.pending}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-sm text-muted-foreground">{t('Accepted Invitations', 'Invitations acceptees')}</span>
              <span className="text-2xl font-bold text-green-600">{invitationMetrics.accepted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('Accepted Matches', 'Matchings acceptes')}</span>
              <span className="text-2xl font-bold text-blue-600">{matchingMetrics.accepted}/{matchingMetrics.total}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">{t('Delivery History', 'Historique des livraisons')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('View shipment history for', 'Voir l historique des expeditions pour')} {periodLabel.toLowerCase()}.
          </p>
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            {showHistory ? t('Hide History', 'Masquer l historique') : t('Show History', 'Afficher l historique')}
          </button>
          <p className="text-xs text-muted-foreground mt-3">{shipmentHistory.length} {t('shipments in this period.', 'expeditions dans cette periode.')}</p>
        </div>
      </div>

      {showHistory && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-foreground">{t('Delivery History List', 'Liste de l historique des livraisons')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {periodLabel}
              </span>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-muted border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">{t('All statuses', 'Tous les statuts')}</option>
                <option value="posted">{t('Posted', 'Publie')}</option>
                <option value="matched">{t('Matched', 'Mis en relation')}</option>
                <option value="in_transit">{t('In transit', 'En transit')}</option>
                <option value="delivered">{t('Delivered', 'Livre')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {filteredShipmentHistory.length > 0 ? (
              filteredShipmentHistory.map((shipment) => (
                <div key={shipment.id} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{shipment.id} - {shipment.itemName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{`${shipment.origin} -> ${shipment.destination}`}</p>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${historyStatusStyles[shipment.status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                        {historyStatusLabels[shipment.status] || t('Unknown', 'Inconnu')}
                      </span>
                      <p>{t('Weight', 'Poids')}: {shipment.weight}</p>
                      <p>{t('Date', 'Date')}: {shipment.date || t('N/A', 'N/A')}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t('No shipments found for this period and status.', 'Aucune expedition trouvee pour cette periode et ce statut.')}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Notifications Section Component
function NotificationsSection({ uiLanguage, notifications, handleClearNotifications, onNotificationClick, onNotificationCall }) {
  const [notificationFilter, setNotificationFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const getNotificationCategory = (notification) => {
    if ((notification.eventType || '').startsWith('invite_')) return 'invitations'
    if (notification.targetRole === 'trucker') return 'truckers'
    if (notification.targetRole === 'shipper') return 'shippers'
    return 'all'
  }

  const formatNotificationCategory = (category) => {
    if (category === 'invitations') return tr(uiLanguage, 'Invitations', 'Invitations', '')
    if (category === 'truckers') return tr(uiLanguage, 'Availability Posts', 'Publications de disponibilite', ' ')
    if (category === 'shippers') return tr(uiLanguage, 'Delivery Requests', 'Demandes de livraison', ' ')
    return tr(uiLanguage, 'All', 'Tous', '')
  }

  const filteredNotifications = notifications.filter((notif) => {
    const category = getNotificationCategory(notif)
    const matchesFilter = notificationFilter === 'all' || category === notificationFilter
    const matchesSearch =
      !searchTerm ||
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{tr(uiLanguage, 'Notifications', 'Notifications', '')}</h1>
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{tr(uiLanguage, 'Recent Notifications', 'Notifications recentes', ' ')}</h2>
          {notifications.length > 0 && (
            <button 
              onClick={handleClearNotifications}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {tr(uiLanguage, 'Clear all', 'Tout effacer', ' ')}
            </button>
          )}
        </div>
        <div className="px-6 pt-4 pb-3 border-b border-border space-y-3">
          <input
            type="text"
            placeholder={tr(uiLanguage, 'Search notifications', 'Rechercher des notifications', '  ')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-1 w-fit">
            <button
              onClick={() => setNotificationFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${notificationFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
            >
              {tr(uiLanguage, 'All', 'Tous', '')}
            </button>
            <button
              onClick={() => setNotificationFilter('invitations')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${notificationFilter === 'invitations' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
            >
              {tr(uiLanguage, 'Invitations', 'Invitations', '')}
            </button>
            <button
              onClick={() => setNotificationFilter('truckers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${notificationFilter === 'truckers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
            >
              {tr(uiLanguage, 'Availability Posts', 'Publications de disponibilite', ' ')}
            </button>
            <button
              onClick={() => setNotificationFilter('shippers')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${notificationFilter === 'shippers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
            >
              {tr(uiLanguage, 'Delivery Requests', 'Demandes de livraison', ' ')}
            </button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => onNotificationClick?.(notif)}
                className={`p-4 transition-colors cursor-pointer ${notif.isRead ? 'hover:bg-muted/70 bg-muted/40' : 'hover:bg-muted'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm text-foreground ${notif.isRead ? 'font-medium' : 'font-semibold'}`}>{notif.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                      {formatNotificationCategory(getNotificationCategory(notif))}
                    </span>
                    {notif.isRead && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">{tr(uiLanguage, 'Read', 'Lu', '')}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{notif.description}</p>
                {getDialablePhone(notif?.action?.phone || notif?.revealedPhone) && (
                  <button
                    type="button"
                    onClick={(event) => onNotificationCall?.(event, notif)}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    {tr(uiLanguage, 'Call now', 'Appeler maintenant')}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">{tr(uiLanguage, 'No notifications found for this filter.', 'Aucune notification trouvee pour ce filtre.')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Settings Section Component
function SettingsSection({ uiLanguage, onLanguagePreview, user, onUserUpdate, pushNotification, storageKey }) {
  const SETTINGS_STORAGE_KEY = storageKey || 'tosselcom.settings.v1'
  const LEGACY_SETTINGS_STORAGE_KEY = 'tosselcom.settings.v1'
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)

  const initialProfile = useMemo(
    () => ({
      ...splitFullName(user?.name),
      name: user?.name || '',
      email: user?.email || '',
      phone: '+213 555 000 000',
      company: 'Tosselcom Logistics',
      photo: '',
      photoScale: 1,
      photoOffsetX: 0,
      photoOffsetY: 0,
      photoRotation: 0,
      photoFit: 'fill',
    }),
    [user],
  )

  const initialNotificationPrefs = useMemo(
    () => ({
      email: true,
      push: true,
      sms: true,
      matchAlerts: true,
      weeklySummary: true,
      marketing: false,
    }),
    [],
  )

  const initialAppPrefs = useMemo(
    () => ({
      language: 'English',
      timezone: 'Africa/Algiers',
      distanceUnit: 'Kilometers (km)',
    }),
    [],
  )

  const storedSettings = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY)
      return null
    }
  }, [SETTINGS_STORAGE_KEY])

  const legacyStoredSettings = useMemo(() => {
    if (typeof window === 'undefined') return null
    if (SETTINGS_STORAGE_KEY === LEGACY_SETTINGS_STORAGE_KEY) return null

    try {
      const raw = window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY)
      if (!raw) return null

      const parsed = JSON.parse(raw)
      const storedProfile = parsed?.profile || {}
      const currentEmail = String(user?.email || '').trim().toLowerCase()
      const currentName = String(user?.name || '').trim().toLowerCase()
      const storedEmail = String(storedProfile?.email || '').trim().toLowerCase()
      const storedName = String(storedProfile?.name || '').trim().toLowerCase()

      if (storedEmail && storedEmail === currentEmail) return parsed
      if (storedName && storedName === currentName) return parsed
      return null
    } catch {
      window.localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY)
      return null
    }
  }, [SETTINGS_STORAGE_KEY, user?.email, user?.name])

  const effectiveStoredSettings = storedSettings || legacyStoredSettings

  const [profile, setProfile] = useState(() => {
    const merged = { ...initialProfile, ...(effectiveStoredSettings?.profile || {}) }
    if (!merged.firstName && !merged.lastName) {
      const parsed = splitFullName(merged.name)
      merged.firstName = parsed.firstName
      merged.lastName = parsed.lastName
    }
    merged.name = buildFullName(merged.firstName, merged.lastName) || merged.name || ''
    return merged
  })
  const [notificationPrefs, setNotificationPrefs] = useState(() => ({ ...initialNotificationPrefs, ...(effectiveStoredSettings?.notificationPrefs || {}) }))
  const [appPrefs, setAppPrefs] = useState(() => {
    const merged = { ...initialAppPrefs, ...(effectiveStoredSettings?.appPrefs || {}) }
    if (merged.language !== 'French' && merged.language !== 'English') {
      merged.language = 'English'
    }
    return merged
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [activeFieldEdit, setActiveFieldEdit] = useState(null)
  const [selectedSettingsSection, setSelectedSettingsSection] = useState(null)
  const [rawPhotoSrc, setRawPhotoSrc] = useState('')
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false)
  const [photoScale, setPhotoScale] = useState(1)
  const [photoRotation, setPhotoRotation] = useState(0)
  const [photoFit, setPhotoFit] = useState('fill')
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 })
  const [photoDragStart, setPhotoDragStart] = useState(null)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => Boolean(effectiveStoredSettings?.twoFactorEnabled))
  const [exportRequestedAt, setExportRequestedAt] = useState('')
  const [settingsSavedAt, setSettingsSavedAt] = useState(() => storedSettings?.settingsSavedAt || '')
  const [saveToast, setSaveToast] = useState(null)
  const profilePhotoInputRef = useRef(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    profile: { ...initialProfile, ...(effectiveStoredSettings?.profile || {}) },
    notificationPrefs: { ...initialNotificationPrefs, ...(effectiveStoredSettings?.notificationPrefs || {}) },
    appPrefs: {
      ...initialAppPrefs,
      ...(effectiveStoredSettings?.appPrefs || {}),
      language: (effectiveStoredSettings?.appPrefs?.language === 'French' || effectiveStoredSettings?.appPrefs?.language === 'English')
        ? effectiveStoredSettings.appPrefs.language
        : 'English',
    },
    twoFactorEnabled: Boolean(effectiveStoredSettings?.twoFactorEnabled),
  }))

  useEffect(() => {
    if (!saveToast) return undefined
    const timer = setTimeout(() => setSaveToast(null), 2000)
    return () => clearTimeout(timer)
  }, [saveToast])

  const normalizedUiLanguage = uiLanguage === 'French' ? 'French' : 'English'

  const hasUnsavedChanges = useMemo(() => {
    const effectiveAppPrefs = { ...appPrefs, language: normalizedUiLanguage }
    return (
      JSON.stringify(profile) !== JSON.stringify(savedSnapshot.profile) ||
      JSON.stringify(notificationPrefs) !== JSON.stringify(savedSnapshot.notificationPrefs) ||
      JSON.stringify(effectiveAppPrefs) !== JSON.stringify(savedSnapshot.appPrefs) ||
      twoFactorEnabled !== savedSnapshot.twoFactorEnabled
    )
  }, [profile, notificationPrefs, appPrefs, twoFactorEnabled, savedSnapshot, normalizedUiLanguage])

  useEffect(() => {
    onUserUpdate?.(profile)
  }, [profile, onUserUpdate])

  const handleToggleNotificationPref = (key) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleToggleTwoFactor = () => {
    setTwoFactorEnabled(prev => !prev)
    pushNotification(
      twoFactorEnabled
        ? tr(uiLanguage, 'Two-factor authentication disabled', 'Authentification a deux facteurs desactivee')
        : tr(uiLanguage, 'Two-factor authentication enabled', 'Authentification a deux facteurs activee'),
    )
  }



  const handleSubmitPasswordChange = () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      pushNotification(tr(uiLanguage, 'Please complete all password fields', 'Veuillez remplir tous les champs du mot de passe'))
      return
    }

    if (passwordForm.next !== passwordForm.confirm) {
      pushNotification(tr(uiLanguage, 'New password and confirm password must match', 'Le nouveau mot de passe et la confirmation doivent correspondre'))
      return
    }

    setPasswordForm({ current: '', next: '', confirm: '' })
    setShowPasswordForm(false)
    pushNotification(tr(uiLanguage, 'Password updated successfully', 'Mot de passe mis a jour avec succes'))
  }

  const handleSaveSettings = () => {
    if (!hasUnsavedChanges) {
      pushNotification(tr(uiLanguage, 'No changes to save', 'Aucune modification a enregistrer'))
      setSaveToast({
        title: tr(uiLanguage, 'All settings are already saved', 'Tous les parametres sont deja enregistres'),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      })
      return
    }

    const savedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const nextSnapshot = {
      profile: { ...profile },
      notificationPrefs: { ...notificationPrefs },
      appPrefs: { ...appPrefs, language: normalizedUiLanguage },
      twoFactorEnabled,
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          ...nextSnapshot,
          settingsSavedAt: savedAt,
          savedAtIso: new Date().toISOString(),
        }),
      )
      window.dispatchEvent(new CustomEvent('settings:updated', {
        detail: {
          language: appPrefs.language,
          timezone: appPrefs.timezone,
          distanceUnit: appPrefs.distanceUnit,
        },
      }))
    }

    setSettingsSavedAt(savedAt)
    setSavedSnapshot(nextSnapshot)
    onUserUpdate?.(nextSnapshot.profile)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user:updated', { detail: nextSnapshot.profile }))
    }
    setSaveToast({
      title: tr(uiLanguage, 'Settings saved', 'Parametres enregistres'),
      time: savedAt,
    })
    pushNotification(tr(uiLanguage, 'Settings saved successfully', 'Parametres enregistres avec succes'))
  }

  const handleProfilePhotoUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      pushNotification(tr(uiLanguage, 'Please upload a valid image file', 'Veuillez televerser une image valide'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = String(reader.result || '')
      if (!imageData) return
      setRawPhotoSrc(imageData)
      setPhotoScale(profile.photoScale || 1)
      setPhotoRotation(profile.photoRotation || 0)
      setPhotoFit(profile.photoFit || 'fill')
      setPhotoOffset({ x: profile.photoOffsetX || 0, y: profile.photoOffsetY || 0 })
      setPhotoEditorOpen(true)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleApplyPhotoCrop = () => {
    if (!rawPhotoSrc) return

    const nextProfile = {
      ...profile,
      photo: rawPhotoSrc,
      photoScale,
      photoOffsetX: photoOffset.x,
      photoOffsetY: photoOffset.y,
      photoRotation,
      photoFit,
    }

    setProfile(nextProfile)
    onUserUpdate?.(nextProfile)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user:updated', { detail: nextProfile }))
    }

    setPhotoEditorOpen(false)
    setRawPhotoSrc('')
    setPhotoDragStart(null)
    setSaveToast({
      title: tr(uiLanguage, 'Profile photo updated', 'Photo de profil mise a jour'),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    })
  }

  const handleClosePhotoEditor = () => {
    setPhotoEditorOpen(false)
    setRawPhotoSrc('')
    setPhotoScale(1)
    setPhotoRotation(0)
    setPhotoFit('fill')
    setPhotoOffset({ x: 0, y: 0 })
    setPhotoDragStart(null)
  }

  const handleResetUnsavedChanges = () => {
    if (!hasUnsavedChanges) {
      pushNotification(tr(uiLanguage, 'No changes to reset', 'Aucune modification a reinitialiser'))
      return
    }

    setProfile({ ...savedSnapshot.profile })
    setNotificationPrefs({ ...savedSnapshot.notificationPrefs })
    setAppPrefs({ ...savedSnapshot.appPrefs })
    onLanguagePreview?.(savedSnapshot.appPrefs.language)
    setTwoFactorEnabled(savedSnapshot.twoFactorEnabled)
    setShowPasswordForm(false)
    setPasswordForm({ current: '', next: '', confirm: '' })
    setActiveFieldEdit(null)
    onUserUpdate?.(savedSnapshot.profile)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user:updated', { detail: savedSnapshot.profile }))
    }
    pushNotification(tr(uiLanguage, 'Unsaved changes reverted', 'Modifications non enregistrees annulees'))
  }

  return (
    <>
      {saveToast && (
        <div className="fixed top-3 right-3 z-[80] w-[calc(100vw-1.5rem)] max-w-72 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-lg p-3 animate-in fade-in slide-in-from-top duration-200 sm:top-5 sm:right-5 sm:w-72">
          <p className="text-sm font-semibold">{saveToast.title}</p>
          <p className="text-xs mt-1">{t('Saved at', 'Enregistre a', '  ')} {saveToast.time}</p>
        </div>
      )}
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-foreground mb-5">{tr(uiLanguage, 'Settings', 'Parametres', '')}</h1>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div
            className="h-32 sm:h-40"
            style={{
              backgroundImage: 'linear-gradient(135deg, #0e4f63 0%, #0e4f63 30%, #ff7a2d 30%, #ff7a2d 46%, #f39a3d 46%, #f39a3d 82%, #f3c63f 82%, #f3c63f 100%)',
            }}
          />
          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
            <div className="-mt-14 sm:-mt-16 flex flex-col items-center text-center">
              <div className="relative rounded-full border-4 border-card overflow-hidden w-28 h-28 sm:w-32 sm:h-32 bg-muted">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt={t('Profile photo', 'Photo de profil')}
                    className="w-full h-full"
                    style={{
                      objectFit: profile.photoFit || 'fill',
                      transform: `translate(${profile.photoOffsetX || 0}px, ${profile.photoOffsetY || 0}px) scale(${profile.photoScale || 1}) rotate(${profile.photoRotation || 0}deg)`,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-primary-foreground bg-primary">
                    {getUserInitial(profile.name)}
                  </div>
                )}
                <button
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute top-1 right-1 w-8 h-8 rounded-full bg-background/95 border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={t('Change photo', 'Changer la photo')}
                >
                  <PenLine className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoUpload}
              />
              <p className="mt-3 text-2xl font-bold text-foreground">{profile.name || t('John Doe', 'John Doe')}</p>
              <p className="text-sm text-muted-foreground">{profile.email || t('No email', 'Aucun e-mail')}</p>
            </div>

            <div className="mt-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setSelectedSettingsSection('personal')
                    setActiveFieldEdit(null)
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedSettingsSection === 'personal' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'}`}
                >
                  <p className="text-sm font-semibold">{t('Personal information', 'Informations personnelles')}</p>
                </button>
                <button
                  onClick={() => {
                    setSelectedSettingsSection('notifications')
                    setActiveFieldEdit(null)
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedSettingsSection === 'notifications' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'}`}
                >
                  <p className="text-sm font-semibold">{t('Notifications & Communication', 'Notifications et communication')}</p>
                </button>
                <button
                  onClick={() => {
                    setSelectedSettingsSection('regional')
                    setActiveFieldEdit(null)
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${selectedSettingsSection === 'regional' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'}`}
                >
                  <p className="text-sm font-semibold">{t('Regional preferences', 'Preferences regionales')}</p>
                </button>
              </div>

              {selectedSettingsSection === 'personal' && (
              <div className="rounded-2xl border border-border bg-background overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{t('Personal information', 'Informations personnelles')}</p>
                </div>

                <div className="divide-y divide-border">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('First name', 'Prenom')}</p>
                      <input
                        type="text"
                        value={profile.firstName || ''}
                        disabled={activeFieldEdit !== 'firstName'}
                        onChange={(e) => setProfile((prev) => {
                          const firstName = e.target.value
                          const name = buildFullName(firstName, prev.lastName)
                          return { ...prev, firstName, name }
                        })}
                        className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${activeFieldEdit === 'firstName' ? 'border-border' : 'border-transparent opacity-90'}`}
                      />
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'firstName' ? null : 'firstName'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'firstName' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Last name', 'Nom')}</p>
                      <input
                        type="text"
                        value={profile.lastName || ''}
                        disabled={activeFieldEdit !== 'lastName'}
                        onChange={(e) => setProfile((prev) => {
                          const lastName = e.target.value
                          const name = buildFullName(prev.firstName, lastName)
                          return { ...prev, lastName, name }
                        })}
                        className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${activeFieldEdit === 'lastName' ? 'border-border' : 'border-transparent opacity-90'}`}
                      />
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'lastName' ? null : 'lastName'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'lastName' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Email', 'E-mail')}</p>
                      <input
                        type="email"
                        value={profile.email}
                        disabled={activeFieldEdit !== 'email'}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${activeFieldEdit === 'email' ? 'border-border' : 'border-transparent opacity-90'}`}
                      />
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'email' ? null : 'email'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'email' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Phone number', 'Numero de telephone')}</p>
                      <input
                        type="text"
                        value={profile.phone}
                        disabled={activeFieldEdit !== 'phone'}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${activeFieldEdit === 'phone' ? 'border-border' : 'border-transparent opacity-90'}`}
                      />
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'phone' ? null : 'phone'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'phone' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Company', 'Societe')}</p>
                      <input
                        type="text"
                        value={profile.company}
                        disabled={activeFieldEdit !== 'company'}
                        onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                        className={`w-full px-3 py-2 bg-muted/50 border rounded-lg text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${activeFieldEdit === 'company' ? 'border-border' : 'border-transparent opacity-90'}`}
                      />
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'company' ? null : 'company'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'company' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Password', 'Mot de passe')}</p>
                      <p className="text-base text-foreground">************</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordForm(prev => !prev)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {showPasswordForm ? t('Close', 'Fermer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  {showPasswordForm && (
                    <div className="px-4 sm:px-5 py-4 bg-muted/40 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="password"
                          placeholder={t('Current password', 'Mot de passe actuel')}
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                          type="password"
                          placeholder={t('New password', 'Nouveau mot de passe')}
                          value={passwordForm.next}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <input
                          type="password"
                          placeholder={t('Confirm new password', 'Confirmer le nouveau mot de passe')}
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <button
                        onClick={handleSubmitPasswordChange}
                        className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        {t('Update Password', 'Mettre a jour le mot de passe')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              {selectedSettingsSection === 'notifications' && (
              <div className="rounded-2xl border border-border bg-background overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{t('Notifications & Communication', 'Notifications et communication')}</p>
                </div>
                <div className="px-4 sm:px-5 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.email} onChange={() => handleToggleNotificationPref('email')} />{t('Email notifications', 'Notifications e-mail')}</label>
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.push} onChange={() => handleToggleNotificationPref('push')} />{t('Push notifications', 'Notifications push')}</label>
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.sms} onChange={() => handleToggleNotificationPref('sms')} />{t('SMS alerts', 'Alertes SMS')}</label>
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.matchAlerts} onChange={() => handleToggleNotificationPref('matchAlerts')} />{t('Match opportunity alerts', 'Alertes opportunite de matching')}</label>
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.weeklySummary} onChange={() => handleToggleNotificationPref('weeklySummary')} />{t('Weekly summary report', 'Rapport resume hebdomadaire')}</label>
                    <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="w-4 h-4" checked={notificationPrefs.marketing} onChange={() => handleToggleNotificationPref('marketing')} />{t('Marketing updates', 'Mises a jour marketing')}</label>
                  </div>
                </div>
              </div>
              )}

              {selectedSettingsSection === 'regional' && (
              <div className="rounded-2xl border border-border bg-background overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{t('Regional preferences', 'Preferences regionales')}</p>
                </div>
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Language', 'Langue')}</p>
                      <select
                        value={normalizedUiLanguage}
                        disabled={activeFieldEdit !== 'language'}
                        onChange={(e) => {
                          const nextLanguage = e.target.value
                          setAppPrefs(prev => ({ ...prev, language: nextLanguage }))
                          onLanguagePreview?.(nextLanguage)
                        }}
                        className="w-full sm:max-w-xs px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      >
                        <option value="English">{t('English', 'Anglais')}</option>
                        <option value="French">{t('French', 'Francais')}</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'language' ? null : 'language'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'language' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Timezone', 'Fuseau horaire')}</p>
                      <select
                        value={appPrefs.timezone}
                        disabled={activeFieldEdit !== 'timezone'}
                        onChange={(e) => setAppPrefs(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full sm:max-w-xs px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      >
                        <option value="Africa/Algiers">Africa/Algiers</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'timezone' ? null : 'timezone'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'timezone' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center px-4 sm:px-5 py-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('Distance Unit', 'Unite de distance')}</p>
                      <select
                        value={appPrefs.distanceUnit}
                        disabled={activeFieldEdit !== 'distance'}
                        onChange={(e) => setAppPrefs(prev => ({ ...prev, distanceUnit: e.target.value }))}
                        className="w-full sm:max-w-xs px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      >
                        <option value="Kilometers (km)">{t('Kilometers (km)', 'Kilometres (km)')}</option>
                        <option value="Miles (mi)">{t('Miles (mi)', 'Miles (mi)')}</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setActiveFieldEdit(prev => (prev === 'distance' ? null : 'distance'))}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
                    >
                      {activeFieldEdit === 'distance' ? t('Done', 'Terminer') : t('Change', 'Changer')}
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-muted-foreground space-y-1">
                {settingsSavedAt && <p>{t('Last saved at', 'Derniere sauvegarde a')} {settingsSavedAt}</p>}
                {exportRequestedAt && <p>{t('Last export request', 'Derniere demande d export')}: {exportRequestedAt}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                
                <button
                  onClick={handleResetUnsavedChanges}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                >
                  {t('Reset Unsaved Changes', 'Reinitialiser les changements non enregistres')}
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  {t('Save Changes', 'Enregistrer les modifications')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {photoEditorOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4" onClick={handleClosePhotoEditor}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-5" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">{t('Edit profile photo', 'Modifier la photo de profil')}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t('Drag to reposition, zoom, rotate, and choose fit mode.', 'Glissez pour repositionner, zoomez, tournez et choisissez le mode d ajustement.')}</p>

            <div
              className="mt-4 mx-auto relative w-64 h-64 rounded-full overflow-hidden border-2 border-border bg-muted cursor-move"
              onMouseDown={(event) => {
                setPhotoDragStart({
                  x: event.clientX,
                  y: event.clientY,
                  offsetX: photoOffset.x,
                  offsetY: photoOffset.y,
                })
              }}
              onMouseMove={(event) => {
                if (!photoDragStart) return
                setPhotoOffset({
                  x: photoDragStart.offsetX + (event.clientX - photoDragStart.x),
                  y: photoDragStart.offsetY + (event.clientY - photoDragStart.y),
                })
              }}
              onMouseUp={() => setPhotoDragStart(null)}
              onMouseLeave={() => setPhotoDragStart(null)}
              onTouchStart={(event) => {
                const touch = event.touches?.[0]
                if (!touch) return
                setPhotoDragStart({
                  x: touch.clientX,
                  y: touch.clientY,
                  offsetX: photoOffset.x,
                  offsetY: photoOffset.y,
                })
              }}
              onTouchMove={(event) => {
                if (!photoDragStart) return
                const touch = event.touches?.[0]
                if (!touch) return
                setPhotoOffset({
                  x: photoDragStart.offsetX + (touch.clientX - photoDragStart.x),
                  y: photoDragStart.offsetY + (touch.clientY - photoDragStart.y),
                })
              }}
              onTouchEnd={() => setPhotoDragStart(null)}
            >
              {rawPhotoSrc && (
                <img
                  src={rawPhotoSrc}
                  alt={t('Crop preview', 'Apercu du recadrage')}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    transform: `translate(${photoOffset.x}px, ${photoOffset.y}px) scale(${photoScale}) rotate(${photoRotation}deg)`,
                    objectFit: photoFit,
                    userSelect: 'none',
                  }}
                />
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setPhotoFit('fill')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${photoFit === 'fill' ? 'border-primary text-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
              >
                {t('Fill space', 'Remplir l espace')}
              </button>
              <button
                onClick={() => setPhotoFit('contain')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${photoFit === 'contain' ? 'border-primary text-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
              >
                {t('Keep ratio', 'Conserver le ratio')}
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-muted-foreground mb-2">{t('Zoom', 'Zoom')}</label>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.01"
                value={photoScale}
                onChange={(event) => setPhotoScale(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4">
              <label className="block text-xs text-muted-foreground mb-2">{t('Rotate', 'Rotation')}</label>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={photoRotation}
                onChange={(event) => setPhotoRotation(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setPhotoScale(1)
                  setPhotoOffset({ x: 0, y: 0 })
                  setPhotoRotation(0)
                  setPhotoFit('fill')
                }}
                className="px-3 py-1.5 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors text-xs font-medium"
              >
                {t('Reset edit', 'Reinitialiser')}
              </button>
              <button
                onClick={() => {
                  const clearedProfile = {
                    ...profile,
                    photo: '',
                    photoScale: 1,
                    photoOffsetX: 0,
                    photoOffsetY: 0,
                    photoRotation: 0,
                    photoFit: 'fill',
                  }
                  setProfile(clearedProfile)
                  onUserUpdate?.(clearedProfile)
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('user:updated', { detail: clearedProfile }))
                  }
                  handleClosePhotoEditor()
                }}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-xs font-medium"
              >
                {t('Remove photo', 'Supprimer la photo')}
              </button>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={handleClosePhotoEditor}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                {t('Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleApplyPhotoCrop}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                {t('Apply', 'Appliquer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Quick Match Section Component (Trucker)
function QuickMatchSection({ uiLanguage, matchingItems, handleAcceptLoad }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [openDetailsId, setOpenDetailsId] = useState(null)

  const toggleDetails = (id) => {
    setOpenDetailsId(prev => (prev === id ? null : id))
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{t('Quick Match - Find Shipments', 'Matching rapide - Trouver des expeditions')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matchingItems.map(item => {
          const isOpen = openDetailsId === item.id
          const reliabilityScore = Math.min(99, item.percentage + 5)
          const estimatedPickup = item.type === 'new' ? t('Within 2-4 hours', 'Sous 2-4 heures') : t('Within 6-12 hours', 'Sous 6-12 heures')

          return (
          <div key={item.id} className={`bg-card border rounded-xl p-6 shadow-sm transition-all ${isOpen ? 'border-primary/50 shadow-md' : 'border-border hover:shadow-md'}`}>
            <div className="mb-4">
              <span className="inline-block text-3xl font-bold text-primary">{item.percentage}%</span>
              <p className="text-xs text-muted-foreground mt-1">{t('Match Score', 'Score de matching')}</p>
            </div>
            <p className="text-foreground text-sm mb-4 line-clamp-3">{item.description}</p>

            {isOpen && (
              <div className="mb-4 p-3 bg-muted rounded-lg border border-border space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('Reference', 'Reference')}</span>
                  <span className="font-medium text-foreground">{item.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('Estimated Pickup', 'Enlevement estime')}</span>
                  <span className="font-medium text-foreground">{estimatedPickup}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('Reliability Score', 'Score de fiabilite')}</span>
                  <span className="font-medium text-foreground">{reliabilityScore}%</span>
                </div>
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground">{t('Suggestion', 'Suggestion')}</p>
                  <p className="text-xs text-foreground mt-1">{t('Contact sender early and confirm pickup window, loading type, and required vehicle capacity.', 'Contactez rapidement l expediteur et confirmez le creneau d enlevement, le type de chargement et la capacite requise du vehicule.')}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => handleAcceptLoad(item)}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
                  item.accepted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {item.accepted ? t('Accepted', 'Accepte') : t('Accept Load', 'Accepter la charge')}
              </button>
              <button
                onClick={() => toggleDetails(item.id)}
                className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-xs font-medium"
              >
                {isOpen ? t('Hide Details', 'Masquer les details') : t('Details', 'Details')}
              </button>
            </div>
            {item.accepted && (
              <p className="text-xs text-green-700 mt-2">
                {t('Load confirmed', 'Charge confirmee')}{item.acceptedAt ? ` ${t('at', 'a')} ${item.acceptedAt}` : ''}.
              </p>
            )}
          </div>
        )})}
      </div>
    </>
  )
}

// Analytics Card Component
function AnalyticsCard({ title, value, change, changeType, icon }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:border-primary/50 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
            changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {changeType === 'up' && <ArrowUp className="w-3 h-3" />}
            {changeType === 'down' && <ArrowDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
      </div>
    </div>
  )
}

function toNormalizedString(value) {
  return String(value || '').trim().toLowerCase()
}

const ROUTE_PLACEHOLDER_VALUES = new Set(['', 'n/a', 'na', 'not specified', 'unknown', 'flexible'])

function normalizeRouteText(value) {
  return toNormalizedString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const WILAYA_ALIASES = {
  algeria: 'alger',
  algiers: 'alger',
  'algiers city': 'alger',
  taref: 'el tarf',
  'el taref': 'el tarf',
  "m'sila": 'm sila',
  msila: 'm sila',
  "el m'ghair": 'el mghair',
  mghair: 'el mghair',
  meniaa: 'el meniaa',
}

let WILAYA_CANONICAL_BY_VARIANT = null

function buildWilayaCanonicalVariantIndex() {
  const index = new Map()

  const registerVariant = (variant, canonical) => {
    const key = normalizeRouteText(variant)
    if (!key) return
    if (!index.has(key)) index.set(key, canonical)
  }

  const registerCanonicalName = (name) => {
    const canonical = normalizeRouteText(name)
    if (!canonical) return

    registerVariant(canonical, canonical)
    registerVariant(canonical.replace(/\s+/g, ''), canonical)

    const tokens = canonical.split(' ').filter(Boolean)
    if (tokens.length > 1) {
      const withoutEl = tokens.filter((token) => token !== 'el').join(' ')
      registerVariant(withoutEl, canonical)
      registerVariant(withoutEl.replace(/\s+/g, ''), canonical)
    }

    if (canonical.startsWith('el ')) {
      const noLeadingEl = canonical.slice(3)
      registerVariant(noLeadingEl, canonical)
      registerVariant(noLeadingEl.replace(/\s+/g, ''), canonical)
    }
  }

  for (const [variant, canonical] of Object.entries(WILAYA_ALIASES)) {
    registerVariant(variant, normalizeRouteText(canonical))
  }

  for (const node of WILAYA_ROUTE_GRAPH_NODES) {
    registerCanonicalName(node.name)
  }

  return index
}

function normalizeWilayaName(value) {
  const normalized = normalizeRouteText(value)
  if (!normalized) return ''

  if (!WILAYA_CANONICAL_BY_VARIANT) {
    WILAYA_CANONICAL_BY_VARIANT = buildWilayaCanonicalVariantIndex()
  }

  return (
    WILAYA_CANONICAL_BY_VARIANT.get(normalized)
    || WILAYA_CANONICAL_BY_VARIANT.get(normalized.replace(/\s+/g, ''))
    || normalized
  )
}

function isMeaningfulRouteValue(value) {
  const normalized = normalizeRouteText(value)
  return Boolean(normalized) && !ROUTE_PLACEHOLDER_VALUES.has(normalized)
}

function getDateKey(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function normalizeDateRangeBounds(startDate, endDate) {
  const normalizedStart = getDateKey(startDate)
  const normalizedEnd = getDateKey(endDate)

  if (!normalizedStart && !normalizedEnd) {
    return { start: '', end: '' }
  }

  const effectiveStart = normalizedStart || normalizedEnd
  const effectiveEnd = normalizedEnd || normalizedStart

  if (!effectiveStart || !effectiveEnd) {
    return { start: '', end: '' }
  }

  return effectiveStart <= effectiveEnd
    ? { start: effectiveStart, end: effectiveEnd }
    : { start: effectiveEnd, end: effectiveStart }
}

function postMatchesDateRange(post, startDate, endDate, getPostDateRange) {
  const filterBounds = normalizeDateRangeBounds(startDate, endDate)
  if (!filterBounds.start || !filterBounds.end) {
    return true
  }

  const postBounds = getPostDateRange(post)
  const postStart = getDateKey(postBounds?.start)
  const postEnd = getDateKey(postBounds?.end || postBounds?.start)

  if (!postStart) {
    return false
  }

  const normalizedPostEnd = postEnd || postStart
  return postStart >= filterBounds.start && normalizedPostEnd <= filterBounds.end
}

function parseAvailabilityDateInterval(rawValue) {
  if (!rawValue) return { start: '', end: '' }

  if (typeof rawValue === 'object' && rawValue !== null) {
    const start = getDateKey(rawValue.start || rawValue.from || rawValue.startDate)
    const end = getDateKey(rawValue.end || rawValue.to || rawValue.endDate)
    return { start, end }
  }

  const parsedAsDate = getDateKey(rawValue)
  if (parsedAsDate) return { start: parsedAsDate, end: parsedAsDate }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) return { start: '', end: '' }

    try {
      const parsed = JSON.parse(trimmed)
      const start = getDateKey(parsed?.start || parsed?.from || parsed?.startDate)
      const end = getDateKey(parsed?.end || parsed?.to || parsed?.endDate)
      return { start, end }
    } catch {
      return { start: '', end: '' }
    }
  }

  return { start: '', end: '' }
}

function buildAvailabilityDateIntervalValue(startDate, endDate) {
  return JSON.stringify({ start: startDate, end: endDate })
}

function formatAvailabilityDateInterval(startDate, endDate) {
  if (!startDate || !endDate) return 'Flexible'
  return `${startDate} to ${endDate}`
}

function isShipmentDateMatchingRouteDate(shipmentDate, routeDateValue, routePostType) {
  const shipmentDateKey = getDateKey(shipmentDate)
  if (!shipmentDateKey) return false

  if (routePostType === 'availability_only') {
    const interval = parseAvailabilityDateInterval(routeDateValue)
    if (!interval.start || !interval.end) return false
    return shipmentDateKey >= interval.start && shipmentDateKey <= interval.end
  }

  const routeDateKey = getDateKey(routeDateValue)
  if (!routeDateKey) return false
  return shipmentDateKey === routeDateKey
}

function getRouteWaypoints(routeFrom, routeVia, routeTo) {
  const waypoints = [routeFrom, routeVia, routeTo]
    .map((value) => String(value || '').trim())
    .filter(isMeaningfulRouteValue)

  return waypoints.filter((value, index) => (
    waypoints.findIndex((candidate) => normalizeWilayaName(candidate) === normalizeWilayaName(value)) === index
  ))
}

const WILAYA_ROUTE_GRAPH_NODES = [
  { id: 1, name: 'Adrar' },
  { id: 2, name: 'Chlef' },
  { id: 3, name: 'Laghouat' },
  { id: 4, name: 'Oum El Bouaghi' },
  { id: 5, name: 'Batna' },
  { id: 6, name: 'Bejaia' },
  { id: 7, name: 'Biskra' },
  { id: 8, name: 'Bechar' },
  { id: 9, name: 'Blida' },
  { id: 10, name: 'Bouira' },
  { id: 11, name: 'Tamanrasset' },
  { id: 12, name: 'Tebessa' },
  { id: 13, name: 'Tlemcen' },
  { id: 14, name: 'Tiaret' },
  { id: 15, name: 'Tizi Ouzou' },
  { id: 16, name: 'Alger' },
  { id: 17, name: 'Djelfa' },
  { id: 18, name: 'Jijel' },
  { id: 19, name: 'Setif' },
  { id: 20, name: 'Saida' },
  { id: 21, name: 'Skikda' },
  { id: 22, name: 'Sidi Bel Abbes' },
  { id: 23, name: 'Annaba' },
  { id: 24, name: 'Guelma' },
  { id: 25, name: 'Constantine' },
  { id: 26, name: 'Medea' },
  { id: 27, name: 'Mostaganem' },
  { id: 28, name: 'M Sila' },
  { id: 29, name: 'Mascara' },
  { id: 30, name: 'Ouargla' },
  { id: 31, name: 'Oran' },
  { id: 32, name: 'El Bayadh' },
  { id: 33, name: 'Illizi' },
  { id: 34, name: 'Bordj Bou Arreridj' },
  { id: 35, name: 'Boumerdes' },
  { id: 36, name: 'El Tarf' },
  { id: 37, name: 'Tindouf' },
  { id: 38, name: 'Tissemsilt' },
  { id: 39, name: 'El Oued' },
  { id: 40, name: 'Khenchela' },
  { id: 41, name: 'Souk Ahras' },
  { id: 42, name: 'Tipaza' },
  { id: 43, name: 'Mila' },
  { id: 44, name: 'Ain Defla' },
  { id: 45, name: 'Naama' },
  { id: 46, name: 'Ain Temouchent' },
  { id: 47, name: 'Ghardaia' },
  { id: 48, name: 'Relizane' },
  { id: 49, name: 'El Mghair' },
  { id: 50, name: 'El Meniaa' },
  { id: 51, name: 'Ouled Djellal' },
  { id: 52, name: 'Bordj Badji Mokhtar' },
  { id: 53, name: 'Beni Abbes' },
  { id: 54, name: 'Timimoun' },
  { id: 55, name: 'Touggourt' },
  { id: 56, name: 'Djanet' },
  { id: 57, name: 'In Salah' },
  { id: 58, name: 'In Guezzam' },
]

const WILAYA_ROUTE_GRAPH_ADJ = {
  1: [8, 52, 53, 54, 57],
  2: [9, 14, 26, 27, 38, 44, 48],
  3: [17, 26, 28, 47],
  4: [5, 19, 25, 40, 43],
  5: [4, 7, 12, 28, 40],
  6: [10, 15, 18, 34],
  7: [5, 17, 28, 30, 39, 51],
  8: [1, 32, 37, 45, 53],
  9: [2, 10, 16, 26, 42],
  10: [6, 9, 15, 16, 26, 28, 34],
  11: [30, 33, 50, 56, 57, 58],
  12: [4, 5, 40, 41],
  13: [14, 20, 22, 45, 46],
  14: [2, 13, 17, 20, 26, 29, 32, 38],
  15: [6, 9, 10, 16, 35],
  16: [9, 10, 15, 26, 35, 42, 44],
  17: [3, 7, 14, 26, 28, 32, 47],
  18: [6, 21, 43],
  19: [4, 6, 10, 28, 34, 43],
  20: [13, 14, 22, 29, 32, 45],
  21: [18, 23, 25, 43],
  22: [13, 20, 27, 29, 31, 46, 48],
  23: [21, 24, 36, 41],
  24: [4, 21, 23, 25, 41, 43],
  25: [4, 21, 24, 43],
  26: [2, 3, 9, 10, 14, 16, 17, 28, 44],
  27: [2, 22, 29, 31, 42, 46, 48],
  28: [3, 5, 7, 10, 17, 19, 26, 34, 47, 51],
  29: [13, 14, 20, 22, 27, 38, 48],
  30: [7, 11, 33, 39, 47, 49, 50, 55],
  31: [13, 22, 27, 42, 46],
  32: [3, 8, 14, 17, 20, 45, 47, 50],
  33: [11, 30, 39, 49, 55, 56],
  34: [6, 10, 19, 28, 43, 44],
  35: [10, 15, 16, 42, 44],
  36: [23, 41],
  37: [1, 8, 45, 53],
  38: [2, 14, 29, 44, 48],
  39: [7, 30, 33, 49, 51, 55],
  40: [4, 5, 7, 12],
  41: [12, 23, 24, 36, 43],
  42: [9, 16, 27, 31, 35, 44, 46],
  43: [4, 18, 19, 21, 24, 25, 34, 41],
  44: [2, 10, 16, 26, 34, 35, 38, 42, 48],
  45: [8, 13, 20, 32, 37, 46],
  46: [13, 22, 27, 31, 42, 45],
  47: [3, 17, 28, 30, 32, 50, 51],
  48: [2, 22, 27, 29, 38, 44],
  49: [7, 30, 33, 39, 51, 55],
  50: [3, 11, 17, 30, 32, 47],
  51: [7, 28, 39, 47, 49, 55],
  52: [1, 8, 53, 57],
  53: [1, 8, 37, 52, 54],
  54: [1, 52, 53, 57],
  55: [30, 33, 39, 49, 51],
  56: [11, 33],
  57: [1, 11, 50, 52, 54, 58],
  58: [11, 57],
}

const WILAYA_ROUTE_NAME_BY_ID = WILAYA_ROUTE_GRAPH_NODES.reduce((acc, node) => {
  acc[node.id] = normalizeWilayaName(node.name)
  return acc
}, {})

const WILAYA_ROUTE_ID_BY_NAME = WILAYA_ROUTE_GRAPH_NODES.reduce((acc, node) => {
  acc[normalizeWilayaName(node.name)] = node.id
  return acc
}, {})

const WILAYA_ROUTE_PATH_CACHE = new Map()

function resolveWilayaRouteName(value) {
  const normalized = normalizeWilayaName(value)
  if (!normalized) return ''
  if (WILAYA_ROUTE_ID_BY_NAME[normalized]) return normalized

  const matchKey = Object.keys(WILAYA_ROUTE_ID_BY_NAME).find((key) => (
    key.includes(normalized) || normalized.includes(key)
  ))

  return matchKey || ''
}

function getShortestWilayaPathNames(startWilaya, endWilaya) {
  const startName = resolveWilayaRouteName(startWilaya)
  const endName = resolveWilayaRouteName(endWilaya)
  if (!startName || !endName) return []

  const cacheKey = `${startName}>${endName}`
  if (WILAYA_ROUTE_PATH_CACHE.has(cacheKey)) return WILAYA_ROUTE_PATH_CACHE.get(cacheKey)

  const startId = WILAYA_ROUTE_ID_BY_NAME[startName]
  const endId = WILAYA_ROUTE_ID_BY_NAME[endName]
  if (!startId || !endId) return []

  if (startId === endId) {
    const singleton = [startName]
    WILAYA_ROUTE_PATH_CACHE.set(cacheKey, singleton)
    return singleton
  }

  const queue = [startId]
  const visited = new Set([startId])
  const previous = {}

  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = WILAYA_ROUTE_GRAPH_ADJ[current] || []

    for (const next of neighbors) {
      if (visited.has(next)) continue
      visited.add(next)
      previous[next] = current

      if (next === endId) {
        const pathIds = []
        let cursor = endId
        while (cursor !== undefined) {
          pathIds.unshift(cursor)
          cursor = previous[cursor]
        }

        const pathNames = pathIds
          .map((id) => WILAYA_ROUTE_NAME_BY_ID[id])
          .filter(Boolean)

        WILAYA_ROUTE_PATH_CACHE.set(cacheKey, pathNames)
        return pathNames
      }

      queue.push(next)
    }
  }

  const fallback = [startName, endName]
  WILAYA_ROUTE_PATH_CACHE.set(cacheKey, fallback)
  return fallback
}

function doesPathContainSubPath(containerPath, targetPath) {
  if (!Array.isArray(containerPath) || !Array.isArray(targetPath)) return false
  if (containerPath.length === 0 || targetPath.length === 0) return false
  if (targetPath.length > containerPath.length) return false

  for (let start = 0; start <= containerPath.length - targetPath.length; start += 1) {
    let matches = true
    for (let offset = 0; offset < targetPath.length; offset += 1) {
      if (containerPath[start + offset] !== targetPath[offset]) {
        matches = false
        break
      }
    }
    if (matches) return true
  }

  return false
}

function routeContainsRequestedSegment(requestedFrom, requestedTo, routeFrom, routeTo) {
  const requestedPath = getShortestWilayaPathNames(requestedFrom, requestedTo)
  const routePath = getShortestWilayaPathNames(routeFrom, routeTo)

  if (!requestedPath.length || !routePath.length) return false
  return doesPathContainSubPath(routePath, requestedPath)
}

function routeCorridorMatchesRequestedSegment(requestedFrom, requestedTo, routeFrom, routeTo, routeVia = '') {
  const requestedFromPoint = getWilayaPoint(requestedFrom)
  const requestedToPoint = getWilayaPoint(requestedTo)
  const routeFromPoint = getWilayaPoint(routeFrom)
  const routeToPoint = getWilayaPoint(routeTo)
  const routeWaypointNames = getRouteWaypoints(routeFrom, routeVia, routeTo)

  if (!requestedFromPoint || !requestedToPoint || !routeFromPoint || !routeToPoint) return false

  const requestedOriginProgress = getSegmentProjectionFactor(requestedFromPoint, routeFromPoint, routeToPoint)
  const requestedDestinationProgress = getSegmentProjectionFactor(requestedToPoint, routeFromPoint, routeToPoint)

  // Direction matters: keep only matches that move forward along the route axis.
  if (requestedOriginProgress >= requestedDestinationProgress) return false

  const requestedNames = [normalizeWilayaName(requestedFrom), normalizeWilayaName(requestedTo)]
  const normalizedRouteNames = routeWaypointNames.map((value) => normalizeWilayaName(value))
  const requestedOriginIndex = normalizedRouteNames.indexOf(requestedNames[0])
  const requestedDestinationIndex = normalizedRouteNames.indexOf(requestedNames[1])

  if (requestedOriginIndex !== -1 && requestedDestinationIndex !== -1) {
    return requestedOriginIndex < requestedDestinationIndex
  }

  const distanceOriginToRoute = getDistancePointToSegmentKm(requestedFromPoint, routeFromPoint, routeToPoint)
  const distanceDestinationToRoute = getDistancePointToSegmentKm(requestedToPoint, routeFromPoint, routeToPoint)
  const averageCorridorDistance = (distanceOriginToRoute + distanceDestinationToRoute) / 2

  return averageCorridorDistance <= 80
}

const WILAYA_COORDS = [
  { name: 'Adrar', lat: 27.8743, lon: -0.2939 },
  { name: 'Chlef', lat: 36.1653, lon: 1.3345 },
  { name: 'Laghouat', lat: 33.8, lon: 2.88 },
  { name: 'Oum El Bouaghi', lat: 35.8722, lon: 7.1135 },
  { name: 'Batna', lat: 35.5559, lon: 6.1741 },
  { name: 'Bejaia', lat: 36.75, lon: 5.07 },
  { name: 'Biskra', lat: 34.85, lon: 5.73 },
  { name: 'Bechar', lat: 31.62, lon: -2.22 },
  { name: 'Blida', lat: 36.47, lon: 2.83 },
  { name: 'Bouira', lat: 36.38, lon: 3.9 },
  { name: 'Tamanrasset', lat: 22.79, lon: 5.52 },
  { name: 'Tebessa', lat: 35.4042, lon: 8.1242 },
  { name: 'Tlemcen', lat: 34.8783, lon: -1.315 },
  { name: 'Tiaret', lat: 35.37, lon: 1.32 },
  { name: 'Tizi Ouzou', lat: 36.71, lon: 4.05 },
  { name: 'Alger', lat: 36.7538, lon: 3.0588 },
  { name: 'Djelfa', lat: 34.67, lon: 3.26 },
  { name: 'Jijel', lat: 36.82, lon: 5.77 },
  { name: 'Setif', lat: 36.1911, lon: 5.4137 },
  { name: 'Saida', lat: 34.83, lon: 0.15 },
  { name: 'Skikda', lat: 36.87, lon: 6.91 },
  { name: 'Sidi Bel Abbes', lat: 35.19, lon: -0.63 },
  { name: 'Annaba', lat: 36.9, lon: 7.76 },
  { name: 'Guelma', lat: 36.46, lon: 7.43 },
  { name: 'Constantine', lat: 36.365, lon: 6.6147 },
  { name: 'Medea', lat: 36.26, lon: 2.75 },
  { name: 'Mostaganem', lat: 35.94, lon: 0.09 },
  { name: 'M Sila', lat: 35.71, lon: 4.54 },
  { name: 'Mascara', lat: 35.4, lon: 0.14 },
  { name: 'Ouargla', lat: 31.95, lon: 5.32 },
  { name: 'Oran', lat: 35.6971, lon: -0.6308 },
  { name: 'El Bayadh', lat: 33.68, lon: 1.02 },
  { name: 'Illizi', lat: 26.5, lon: 8.47 },
  { name: 'Bordj Bou Arreridj', lat: 36.0732, lon: 4.7611 },
  { name: 'Boumerdes', lat: 36.76, lon: 3.47 },
  { name: 'El Tarf', lat: 36.7672, lon: 8.3138 },
  { name: 'Tindouf', lat: 27.67, lon: -8.15 },
  { name: 'Tissemsilt', lat: 35.61, lon: 1.81 },
  { name: 'El Oued', lat: 33.3678, lon: 6.8515 },
  { name: 'Khenchela', lat: 35.43, lon: 7.14 },
  { name: 'Souk Ahras', lat: 36.2864, lon: 7.9511 },
  { name: 'Tipaza', lat: 36.59, lon: 2.45 },
  { name: 'Mila', lat: 36.45, lon: 6.26 },
  { name: 'Ain Defla', lat: 36.264, lon: 1.9679 },
  { name: 'Naama', lat: 33.2667, lon: -0.3167 },
  { name: 'Ain Temouchent', lat: 35.3, lon: -1.14 },
  { name: 'Ghardaia', lat: 32.49, lon: 3.67 },
  { name: 'Relizane', lat: 35.74, lon: 0.55 },
  { name: 'Timimoun', lat: 29.26, lon: 0.23 },
  { name: 'Bordj Badji Mokhtar', lat: 21.33, lon: 0.95 },
  { name: 'Ouled Djellal', lat: 34.42, lon: 5.06 },
  { name: 'Beni Abbes', lat: 30.13, lon: -2.17 },
  { name: 'In Salah', lat: 27.2, lon: 2.47 },
  { name: 'In Guezzam', lat: 19.57, lon: 5.77 },
  { name: 'Touggourt', lat: 33.1, lon: 6.07 },
  { name: 'Djanet', lat: 24.55, lon: 9.48 },
  { name: 'El Mghair', lat: 33.95, lon: 5.92 },
  { name: 'El Meniaa', lat: 30.57, lon: 2.88 },
]

const WILAYA_COORDS_BY_NAME = WILAYA_COORDS.reduce((acc, wilaya) => {
  acc[normalizeWilayaName(wilaya.name)] = { lat: wilaya.lat, lon: wilaya.lon }
  return acc
}, {})

function getWilayaPoint(name) {
  const normalized = normalizeWilayaName(name)
  if (!normalized) return null
  if (WILAYA_COORDS_BY_NAME[normalized]) return WILAYA_COORDS_BY_NAME[normalized]

  const partialMatchKey = Object.keys(WILAYA_COORDS_BY_NAME).find((key) => (
    key.includes(normalized) || normalized.includes(key)
  ))

  return partialMatchKey ? WILAYA_COORDS_BY_NAME[partialMatchKey] : null
}

function toRad(value) {
  return (value * Math.PI) / 180
}

function haversineDistanceKm(a, b) {
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)))
}

function projectToLocalKm(point, referenceLat) {
  const kmPerLat = 111.32
  const kmPerLon = 111.32 * Math.cos(toRad(referenceLat))
  return {
    x: point.lon * kmPerLon,
    y: point.lat * kmPerLat,
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getSegmentProjectionFactor(point, segmentStart, segmentEnd) {
  const referenceLat = (segmentStart.lat + segmentEnd.lat) / 2
  const p = projectToLocalKm(point, referenceLat)
  const a = projectToLocalKm(segmentStart, referenceLat)
  const b = projectToLocalKm(segmentEnd, referenceLat)

  const abx = b.x - a.x
  const aby = b.y - a.y
  const abLengthSquared = abx * abx + aby * aby
  if (abLengthSquared <= 0) return 0

  const apx = p.x - a.x
  const apy = p.y - a.y
  return clamp((apx * abx + apy * aby) / abLengthSquared, 0, 1)
}

function getDistancePointToSegmentKm(point, segmentStart, segmentEnd) {
  const t = getSegmentProjectionFactor(point, segmentStart, segmentEnd)
  const projected = {
    lat: segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * t,
    lon: segmentStart.lon + (segmentEnd.lon - segmentStart.lon) * t,
  }
  return haversineDistanceKm(point, projected)
}

function parseDateSafe(dateValue) {
  if (!dateValue) return null
  const parsed = new Date(dateValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getAbsoluteDayDiff(dateA, dateB) {
  if (!dateA || !dateB) return null
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.abs(dateA.getTime() - dateB.getTime()) / msPerDay
}

function computeWeightedRouteRelevance({
  shipmentOrigin,
  shipmentDestination,
  shipmentWeight,
  shipmentVolume,
  shipmentDate,
  routeFrom,
  routeTo,
  routeAvailable,
  routeVolume,
  routeAvailableCity,
  routeDeparture,
  routePostType,
}) {
  const normalizedShipmentOrigin = normalizeWilayaName(shipmentOrigin)
  const normalizedShipmentDestination = normalizeWilayaName(shipmentDestination)
  const normalizedRouteFrom = normalizeWilayaName(routeFrom)
  const normalizedRouteTo = normalizeWilayaName(routeTo)
  const normalizedRouteVia = normalizeWilayaName(routeAvailableCity)

  const originMatch = normalizedShipmentOrigin && normalizedShipmentOrigin === normalizedRouteFrom
  const destinationMatch = normalizedShipmentDestination && normalizedShipmentDestination === normalizedRouteTo
  const reverseRouteMatch = (
    normalizedShipmentOrigin
    && normalizedShipmentDestination
    && normalizedShipmentOrigin === normalizedRouteTo
    && normalizedShipmentDestination === normalizedRouteFrom
  )
  const routeIsAvailabilityOnly = routePostType === 'availability_only'

  let routeScore = 0
  if (originMatch && destinationMatch) routeScore += 18
  else if (reverseRouteMatch) routeScore += 6
  else if (originMatch || destinationMatch) routeScore += 10
  else if (routeIsAvailabilityOnly) routeScore += 3

  const shipmentOriginPoint = getWilayaPoint(shipmentOrigin)
  const shipmentDestinationPoint = getWilayaPoint(shipmentDestination)
  const routeFromPoint = getWilayaPoint(routeFrom)
  const routeToPoint = getWilayaPoint(routeTo)
  const routeWaypoints = getRouteWaypoints(routeFrom, routeAvailableCity, routeTo)

  const shipmentDateKey = getDateKey(shipmentDate)
  const routeDateKey = getDateKey(routeDeparture)
  const availabilityInterval = routeIsAvailabilityOnly
    ? parseAvailabilityDateInterval(routeDeparture)
    : { start: '', end: '' }

  let dateScore = 4
  if (routeIsAvailabilityOnly) {
    const isInsideInterval = shipmentDateKey
      && availabilityInterval.start
      && availabilityInterval.end
      && shipmentDateKey >= availabilityInterval.start
      && shipmentDateKey <= availabilityInterval.end

    if (isInsideInterval) {
      dateScore = 45
    } else if (shipmentDateKey && availabilityInterval.start && availabilityInterval.end) {
      const shipmentParsedDate = parseDateSafe(shipmentDate)
      const intervalStart = parseDateSafe(availabilityInterval.start)
      const intervalEnd = parseDateSafe(availabilityInterval.end)
      const startDiff = getAbsoluteDayDiff(shipmentParsedDate, intervalStart)
      const endDiff = getAbsoluteDayDiff(shipmentParsedDate, intervalEnd)
      const nearestDiff = Math.min(startDiff ?? Number.MAX_SAFE_INTEGER, endDiff ?? Number.MAX_SAFE_INTEGER)

      if (nearestDiff <= 1) dateScore = 28
      else if (nearestDiff <= 3) dateScore = 18
      else if (nearestDiff <= 7) dateScore = 10
      else dateScore = 4
    }
  } else if (shipmentDateKey && routeDateKey) {
    if (shipmentDateKey === routeDateKey) dateScore = 45
    else {
      const shipmentParsedDate = parseDateSafe(shipmentDate)
      const routeParsedDate = parseDateSafe(routeDeparture)
      const dayDiff = getAbsoluteDayDiff(shipmentParsedDate, routeParsedDate)
      if (dayDiff !== null) {
        if (dayDiff <= 1) dateScore = 30
        else if (dayDiff <= 3) dateScore = 20
        else if (dayDiff <= 7) dateScore = 12
        else dateScore = 4
      }
    }
  } else if (shipmentDateKey || routeDateKey) {
    dateScore = 8
  }

  const shipmentKg = parseNumericInput(shipmentWeight)
  const routeAvailableKg = parseNumericInput(routeAvailable)
  const shipmentM3 = parseNumericInput(shipmentVolume)
  const routeAvailableM3 = parseNumericInput(routeVolume)

  if (
    (Number.isFinite(shipmentKg) && Number.isFinite(routeAvailableKg) && routeAvailableKg < shipmentKg)
    || (Number.isFinite(shipmentM3) && Number.isFinite(routeAvailableM3) && routeAvailableM3 < shipmentM3)
  ) {
    return 0
  }

  let capacityScore = 0
  if (Number.isFinite(shipmentKg) && Number.isFinite(routeAvailableKg)) {
    const capacityGap = Math.max(shipmentKg - routeAvailableKg, 0)
    capacityScore = clamp(20 - ((capacityGap / Math.max(shipmentKg, 1)) * 20), 0, 20)
  } else if (Number.isFinite(routeAvailableKg)) {
    capacityScore = 8
  }

  let volumeScore = 0
  if (Number.isFinite(shipmentM3) && Number.isFinite(routeAvailableM3)) {
    const volumeGap = Math.max(shipmentM3 - routeAvailableM3, 0)
    volumeScore = clamp(20 - ((volumeGap / Math.max(shipmentM3, 1)) * 20), 0, 20)
  } else if (Number.isFinite(routeAvailableM3)) {
    volumeScore = 8
  }

  let routeShapeScore = 0
  if (routeWaypoints.length >= 2) {
    const normalizedWaypoints = routeWaypoints.map((value) => normalizeWilayaName(value))
    const originIndex = normalizedWaypoints.indexOf(normalizedShipmentOrigin)
    const destinationIndex = normalizedWaypoints.indexOf(normalizedShipmentDestination)

    if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
      routeShapeScore += 12
    }

    if (normalizedWaypoints.includes(normalizedShipmentOrigin)) routeShapeScore += 5
    if (normalizedWaypoints.includes(normalizedShipmentDestination)) routeShapeScore += 5
    if (normalizedWaypoints.includes(normalizedRouteVia) && normalizedRouteVia) routeShapeScore += 3
  }

  let corridorScore = 0
  let directionScore = 0

  if (shipmentOriginPoint && shipmentDestinationPoint && routeFromPoint && routeToPoint) {
    const distanceOriginToRoute = getDistancePointToSegmentKm(shipmentOriginPoint, routeFromPoint, routeToPoint)
    const distanceDestinationToRoute = getDistancePointToSegmentKm(shipmentDestinationPoint, routeFromPoint, routeToPoint)
    const averageCorridorDistance = (distanceOriginToRoute + distanceDestinationToRoute) / 2

    corridorScore = clamp(15 - averageCorridorDistance * 0.25, 0, 15)

    const startDistance = haversineDistanceKm(shipmentOriginPoint, routeFromPoint)
    const endDistance = haversineDistanceKm(shipmentDestinationPoint, routeToPoint)
    routeShapeScore += clamp(10 - (startDistance + endDistance) * 0.05, 0, 10)

    const originProgress = getSegmentProjectionFactor(shipmentOriginPoint, routeFromPoint, routeToPoint)
    const destinationProgress = getSegmentProjectionFactor(shipmentDestinationPoint, routeFromPoint, routeToPoint)
    directionScore = originProgress <= destinationProgress ? 5 : 1
  }

  const totalScore = dateScore + capacityScore + volumeScore + routeScore + routeShapeScore + corridorScore + directionScore
  return Math.min(100, Math.max(0, Math.round(totalScore)))
}

// Shipment Card Component
function ShipmentCard({ uiLanguage, id, itemName, origin, destination, weight, capacity, volume, dimensions, category, description, date, status, type, photo, ownerName = '', ownershipTag = '', routeItems, onStatusChange, onDelete, onToggleDetails, showDetails, isReadOnly = false, showInvite = false, onInvite, inviteSent = false, inviteDisabled = false }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [relevantRouteFilter, setRelevantRouteFilter] = useState('all')
  const statusActionLabel = getShipmentStatusActionLabel(status)
  const isStatusLocked = !getNextShipmentStatus(status)
  const statusStyles = {
    posted: 'bg-blue-50 text-blue-700 border-blue-200',
    matched: 'bg-green-50 text-green-700 border-green-200',
    in_transit: 'bg-amber-50 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const statusLabel = {
    posted: t('Posted', 'Publie'),
    matched: t('Matched', 'Mis en relation'),
    in_transit: t('In Transit', 'En transit'),
    delivered: t('Delivered', 'Livre'),
  }

  const typeStyles = {
    general: 'bg-blue-100 text-blue-800 border-blue-300',
    standard: 'bg-blue-100 text-blue-800 border-blue-300',
    furniture: 'bg-amber-100 text-amber-800 border-amber-300',
    appliances: 'bg-slate-100 text-slate-800 border-slate-300',
    fragile: 'bg-red-100 text-red-800 border-red-300',
    perishable: 'bg-orange-100 text-orange-800 border-orange-300',
    hazardous: 'bg-purple-100 text-purple-800 border-purple-300',
    electronics: 'bg-green-100 text-green-800 border-green-300',
    construction: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    other: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  }

  const typeLabel = {
    general: t('General', 'General'),
    standard: t('Standard', 'Standard'),
    furniture: t('Furniture', 'Mobilier'),
    appliances: t('Appliances', 'Electromenager'),
    fragile: t('Fragile', 'Fragile'),
    perishable: t('Perishable', 'Perissable'),
    hazardous: t('Hazardous', 'Dangereux'),
    electronics: t('Electronics', 'Electronique'),
    construction: t('Construction', 'Construction'),
    other: t('Other', 'Autre'),
  }

  const shipmentCategory = category || type || 'general'
  const scoredRelevantRoutePosts = (routeItems || [])
    .filter(route => route.id !== id)
    .filter((route) => {
      const shipmentWeightValue = parseNumericInput(weight)
      const shipmentVolumeValue = parseNumericInput(volume ?? capacity)
      const routeCapacityValue = parseNumericInput(route.available ?? route.capacity)
      const routeVolumeValue = parseNumericInput(route.volume ?? route.available ?? route.capacity)

      if (!Number.isFinite(shipmentWeightValue) || !Number.isFinite(shipmentVolumeValue)) return false
      if (!Number.isFinite(routeCapacityValue) || !Number.isFinite(routeVolumeValue)) return false

      return routeCapacityValue >= shipmentWeightValue && routeVolumeValue >= shipmentVolumeValue
    })
    .map(route => {
      const score = computeWeightedRouteRelevance({
        shipmentOrigin: origin,
        shipmentDestination: destination,
        shipmentWeight: weight,
        shipmentVolume: volume ?? capacity,
        shipmentDate: date,
        routeFrom: route.from,
        routeTo: route.to,
        routeAvailable: route.available,
        routeVolume: route.volume ?? route.available ?? route.capacity,
        routeAvailableCity: route.availableCity,
        routeDeparture: route.routeDateRaw || route.departure,
        routePostType: route.postType,
      })
      return { ...route, relevanceScore: score }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  const relevantRoutePosts = scoredRelevantRoutePosts
  const visibleRelevantRoutePosts = relevantRoutePosts

  const handleDeleteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete?.()
  }

  const stopCardClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggleDetails?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggleDetails?.()
        }
      }}
      className="p-4 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/30 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{id}</p>
          {itemName && <p className="text-sm text-foreground/80 mt-0.5">{itemName}</p>}
          {ownerName && <p className="text-xs text-muted-foreground mt-0.5">{t('Posted by', 'Publie par')}: {ownerName}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ownershipTag && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ownershipTag === 'My Post' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {ownershipTag}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyles[status]}`}>
            {statusLabel[status]}
          </span>
          {(category || type) && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeStyles[shipmentCategory] || typeStyles.general}`}>
              {typeLabel[shipmentCategory] || t('General', 'General')}
            </span>
          )}
          {!isReadOnly && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-colors text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground flex-1">
          <MapPin className="w-4 h-4 mt-0.5" />
          <span>{origin} → {destination}</span>
        </div>
        <div className="text-right">
          <span className="text-foreground font-medium block">{formatWeightKg(weight)}</span>
          {(volume || capacity) && <span className="text-xs text-muted-foreground">{t('Dimensions', 'Dimensions')}: {formatVolumeM3(volume || capacity)}</span>}
        </div>
      </div>

      {photo && (
        <div className="mt-3">
          <Image
            src={photo}
            alt={`${itemName || t('Shipment', 'Expedition')} ${t('photo', 'photo')}`}
            width={960}
            height={256}
            unoptimized
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
        </div>
      )}

      {showInvite && onInvite && !showDetails && (
        <button
          type="button"
          onClick={(event) => {
            stopCardClick(event)
            onInvite()
          }}
          disabled={inviteSent || inviteDisabled}
          className={`mt-3 w-full px-3 py-2 text-xs font-medium rounded transition-colors ${(inviteSent || inviteDisabled) ? 'bg-slate-400 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
        >
          {inviteSent
            ? t('Invitation Sent', 'Invitation envoyee')
            : t('Send Invitation', 'Envoyer une invitation')}
        </button>
      )}
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border space-y-2 animate-in fade-in">
          <div className="space-y-1 pb-2">
            <p className="text-xs text-muted-foreground">{t('Item', 'Article')}: <span className="text-foreground">{itemName || t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}: <span className="text-foreground">{formatWeightKg(weight)}</span></p>
            <p className="text-xs text-muted-foreground">{t('Dimensions', 'Dimensions')}: <span className="text-foreground">{(volume || capacity) ? formatVolumeM3(volume || capacity) : t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Category', 'Categorie')}: <span className="text-foreground">{typeLabel[shipmentCategory] || t('General', 'General')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Dimensions', 'Dimensions')}: <span className="text-foreground">{dimensions || t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Route', 'Trajet')}: <span className="text-foreground">{origin} {t('to', 'vers')} {destination}</span></p>
            <p className="text-xs text-muted-foreground">{t('Notes', 'Notes')}: <span className="text-foreground">{description || t('N/A', 'N/A')}</span></p>
          </div>

          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-foreground">{t('Most relevant trucker posts (same route)', 'Publications transporteurs les plus pertinentes (meme trajet)')}</p>
              <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <button
                  type="button"
                  onClick={(event) => {
                    stopCardClick(event)
                    setRelevantRouteFilter('all')
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${relevantRouteFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
                >
                  {t('All', 'Tous')}
                </button>

              </div>
            </div>
            {visibleRelevantRoutePosts.length > 0 ? (
              <div className="space-y-2">
                {visibleRelevantRoutePosts.map(route => (
                  <div key={route.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{route.id} - {route.from} {t('to', 'vers')} {route.to}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('No relevant trucker posts found for this route.', 'Aucune publication transporteur pertinente pour ce trajet.')}
              </p>
            )}
          </div>

          {showInvite && onInvite && (
            <button
              type="button"
              onClick={(event) => {
                stopCardClick(event)
                onInvite()
              }}
              disabled={inviteSent || inviteDisabled}
              className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${(inviteSent || inviteDisabled) ? 'bg-slate-400 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {inviteSent
                ? t('Invitation Sent', 'Invitation envoyee')
                : t('Send Invitation', 'Envoyer une invitation')}
            </button>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={(event) => {
                stopCardClick(event)
                onStatusChange?.()
              }}
              disabled={isStatusLocked}
              className="w-full px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {statusActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Route Card Component
function RouteCard({ uiLanguage, id, from, to, capacity, volume, available, departure, postType = 'full_route', availableCity = '', vehicleAllocation = [], isLive = false, driverName = 'Unknown driver', currentStop = '', ownerName = '', ownershipTag = '', shipmentItems, onDelete, onContact, contactLabel = 'Send Invitation', contactSent = false, contactDisabled = false, onContactRelevantShipment, isRelevantShipmentInvitationSent, onToggleDetails, showDetails, showNestedRelevant = true }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const capacityNum = parseFloat(capacity)
  const availableNum = parseFloat(available)
  const utilizationPercent = capacityNum > 0 ? ((capacityNum - availableNum) / capacityNum) * 100 : 0
  const isAvailabilityOnly = postType === 'availability_only'
  const relevantShipments = (shipmentItems || [])
    .filter(shipment => {
      const shipmentWeightValue = parseNumericInput(shipment.weight)
      const shipmentVolumeValue = parseNumericInput(shipment.volume ?? shipment.capacity)
      const routeCapacityValue = parseNumericInput(available)
      const routeVolumeValue = parseNumericInput(volume ?? available)

      if (!Number.isFinite(shipmentWeightValue) || !Number.isFinite(shipmentVolumeValue)) return false
      if (!Number.isFinite(routeCapacityValue) || !Number.isFinite(routeVolumeValue)) return false

      return routeCapacityValue >= shipmentWeightValue && routeVolumeValue >= shipmentVolumeValue
    })
    .map(shipment => {
      const score = computeWeightedRouteRelevance({
        shipmentOrigin: shipment.origin,
        shipmentDestination: shipment.destination,
        shipmentWeight: shipment.weight,
        shipmentVolume: shipment.volume ?? shipment.capacity,
        shipmentDate: shipment.date,
        routeFrom: from,
        routeTo: to,
        routeAvailable: available,
        routeVolume: volume ?? available,
        routeAvailableCity: availableCity,
        routeDeparture: departure,
        routePostType: postType,
      })
      return { ...shipment, relevanceScore: score }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  const handleDeleteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete?.()
  }

  const stopCardClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggleDetails?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggleDetails?.()
        }
      }}
      className="p-4 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/30 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{id}</p>
          {ownerName && <p className="text-xs text-muted-foreground mt-0.5">{t('Posted by', 'Publie par')}: {ownerName}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{departure}</p>
        </div>
        <div className="flex items-center gap-2">
          {ownershipTag && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${ownershipTag === 'My Post' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {ownershipTag}
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isAvailabilityOnly ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {isAvailabilityOnly ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-colors text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>
            {isAvailabilityOnly
              ? `${t('Available on', 'Disponible sur')}: ${availableCity || from || t('N/A', 'N/A')}`
              : `${from} → ${to}`}
          </span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Driver', 'Conducteur')}: {driverName}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Capacity', 'Capacite')}: {formatWeightKg(capacity)}</span>
          <span className="text-foreground font-medium">{formatWeightKg(available)} {t('available', 'disponible')}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Volume', 'Volume')}: {formatVolumeM3(volume || capacity)}</span>
        </div>
        <div className="flex items-center justify-between text-xs gap-3">
          <span className="text-muted-foreground">{t('Vehicles', 'Vehicules')}: {formatVehicleAllocationSummary(vehicleAllocation, capacity)}</span>
        </div>
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
      </div>
      {onContact && (
        <button
          type="button"
          onClick={(event) => {
            stopCardClick(event)
            onContact()
          }}
          disabled={contactSent || contactDisabled}
          className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${(contactSent || contactDisabled) ? 'bg-slate-400 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
        >
          {contactSent
            ? t('Invitation Sent', 'Invitation envoyee')
            : contactLabel}
        </button>
      )}

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('Post Type', 'Type de publication')}: <span className="text-foreground">{isAvailabilityOnly ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Route', 'Trajet')}: <span className="text-foreground">{isAvailabilityOnly ? `${t('Available on', 'Disponible sur')} ${availableCity || from || t('N/A', 'N/A')}` : `${from} ${t('to', 'vers')} ${to}`}</span></p>
            <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}: <span className="text-foreground">{formatWeightKg(capacity)}</span></p>
            <p className="text-xs text-muted-foreground">{t('Volume', 'Volume')}: <span className="text-foreground">{formatVolumeM3(volume || capacity)}</span></p>
            <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}: <span className="text-foreground">{formatWeightKg(available)}</span></p>
            <p className="text-xs text-muted-foreground">{t('Vehicles', 'Vehicules')}: <span className="text-foreground">{formatVehicleAllocationSummary(vehicleAllocation, capacity)}</span></p>
            <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}: <span className="text-foreground">{driverName}</span></p>
            <p className="text-xs text-muted-foreground">{t('Departure', 'Depart')}: <span className="text-foreground">{departure}</span></p>
          </div>

          {showNestedRelevant && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold text-foreground mb-2">{t('Most relevant shipment posts (same route)', 'Publications d expedition les plus pertinentes (meme trajet)')}</p>
              {relevantShipments.length > 0 ? (
                <div className="space-y-2">
                  {relevantShipments.map(shipment => (
                    <div key={shipment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-foreground">{shipment.id} - {shipment.origin} {t('to', 'vers')} {shipment.destination}</span>
                      </div>
                      {onContactRelevantShipment && (
                        <button
                          type="button"
                          onClick={(event) => {
                            stopCardClick(event)
                            onContactRelevantShipment(shipment)
                          }}
                          disabled={Boolean(isRelevantShipmentInvitationSent?.(shipment.id))}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${isRelevantShipmentInvitationSent?.(shipment.id) ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                        >
                          {isRelevantShipmentInvitationSent?.(shipment.id) ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('No relevant shipment post found for this route.', 'Aucune publication d expedition pertinente pour ce trajet.')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PostDetailPage({ uiLanguage, detailView, shipmentItems, routeItems, currentUserKey, onClose, advanceShipmentStatus, deleteShipment, deleteRoute, onUpdateShipment, onUpdateRoute, contactShipper, isInvitationSent }) {
  // Early returns must happen BEFORE any hooks
  if (!detailView?.type || !detailView?.id) return null

  const selectedShipment = detailView.type === 'shipment'
    ? shipmentItems.find(item => item.id === detailView.id)
    : null
  const selectedRoute = detailView.type === 'route'
    ? routeItems.find(item => item.id === detailView.id)
    : null

  if (!selectedShipment && !selectedRoute) return null

  // Now safe to call hooks
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [relevantRouteFilter, setRelevantRouteFilter] = useState('all')
  const [isFullRouteSectionOpen, setIsFullRouteSectionOpen] = useState(true)
  const [isAvailabilityOnlySectionOpen, setIsAvailabilityOnlySectionOpen] = useState(true)
  const [isEditingShipment, setIsEditingShipment] = useState(false)
  const [isEditingRoute, setIsEditingRoute] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [shipmentDraft, setShipmentDraft] = useState({ itemName: '', origin: '', destination: '', weight: '', capacity: '', date: '', category: 'general', description: '' })
  const [routeDraft, setRouteDraft] = useState({ postType: 'full_route', from: '', to: '', capacity: '', volume: '', vehicleCount: '1', vehicleAllocations: [createVehicleAllocationInput()], departure: '', availableCity: '', availabilityStartDate: '', availabilityEndDate: '' })

  const selectedShipmentIsMine = selectedShipment
    ? getPostOwnerKey(selectedShipment) === currentUserKey
    : false
  const selectedRouteIsMine = selectedRoute
    ? getPostOwnerKey(selectedRoute) === currentUserKey
    : false
  const canViewRelevantSection = selectedShipment ? selectedShipmentIsMine : selectedRouteIsMine
  const myDetailRoutes = routeItems.filter((route) => getPostOwnerKey(route) === currentUserKey)
  const myDetailShipments = shipmentItems.filter((shipment) => getPostOwnerKey(shipment) === currentUserKey)

  useEffect(() => {
    if (!selectedShipment) return
    setIsEditingShipment(false)
    setShipmentDraft({
      itemName: selectedShipment.itemName || '',
      origin: selectedShipment.origin || '',
      destination: selectedShipment.destination || '',
      weight: selectedShipment.weight || '',
      capacity: selectedShipment.capacity || '',
      date: selectedShipment.date || '',
      category: selectedShipment.category || selectedShipment.type || 'general',
      description: selectedShipment.description || '',
    })
  }, [selectedShipment?.id])

  useEffect(() => {
    if (!selectedRoute) return
    setIsEditingRoute(false)
    const selectedVehicleAllocations = normalizeVehicleAllocationRecords(selectedRoute.vehicleAllocation, selectedRoute.capacity)
    const availabilityInterval = parseAvailabilityDateInterval(selectedRoute.routeDateRaw || selectedRoute.departure)
    setRouteDraft({
      postType: selectedRoute.postType || 'full_route',
      from: selectedRoute.from || '',
      to: selectedRoute.to || '',
      capacity: selectedRoute.capacity || '',
      volume: selectedRoute.volume || '',
      vehicleCount: String(selectedVehicleAllocations.length || 1),
      vehicleAllocations: selectedVehicleAllocations.length > 0
        ? selectedVehicleAllocations.map((entry) => createVehicleAllocationInput({
          type: entry.type || entry.name,
          capacity: String(entry.capacity ?? ''),
          volume: String(entry.volume ?? ''),
        }))
        : [createVehicleAllocationInput({ capacity: String(selectedRoute.capacity || '') })],
      departure: selectedRoute.postType === 'full_route' ? (selectedRoute.routeDateRaw || selectedRoute.departure || '') : '',
      availableCity: selectedRoute.availableCity || '',
      availabilityStartDate: availabilityInterval.start || selectedRoute.availabilityStartDate || '',
      availabilityEndDate: availabilityInterval.end || selectedRoute.availabilityEndDate || '',
    })
  }, [selectedRoute?.id])

  useEffect(() => {
    if (!selectedShipment) return
    setIsFullRouteSectionOpen(true)
    setIsAvailabilityOnlySectionOpen(true)
  }, [selectedShipment?.id])

  const shipmentRelevantRoutes = selectedShipment
    ? routeItems
      .filter((route) => getPostOwnerKey(route) !== currentUserKey)
      .filter((route) => {
        if (route.postType === 'availability_only') {
          const availabilityCity = route.availableCity || route.from
          return isMeaningfulRouteValue(availabilityCity)
        }

        return (
          isMeaningfulRouteValue(route.from)
          && isMeaningfulRouteValue(route.to)
          && normalizeWilayaName(route.from) !== normalizeWilayaName(route.to)
        )
      })
      .filter((route) => {
        const shipmentWeightValue = parseNumericInput(selectedShipment.weight)
        const shipmentVolumeValue = parseNumericInput(selectedShipment.volume ?? selectedShipment.capacity)
        const routeDateSource = route.routeDateRaw || route.departure

        if (!isShipmentDateMatchingRouteDate(selectedShipment.date, routeDateSource, route.postType)) return false

        if (!Number.isFinite(shipmentWeightValue) || !Number.isFinite(shipmentVolumeValue)) return false

        const routeCapacityValue = parseNumericInput(route.available ?? route.capacity)
        const routeVolumeValue = parseNumericInput(route.volume ?? route.available ?? route.capacity)
        if (!Number.isFinite(routeCapacityValue) || !Number.isFinite(routeVolumeValue)) return false

        return routeCapacityValue >= shipmentWeightValue && routeVolumeValue >= shipmentVolumeValue
      })
      .map(route => ({
        availabilityDistanceKm: (() => {
          if (route.postType !== 'availability_only') return null
          const originPoint = getWilayaPoint(selectedShipment.origin)
          const availabilityPoint = getWilayaPoint(route.availableCity || route.from)
          if (!originPoint || !availabilityPoint) return Number.MAX_SAFE_INTEGER
          return haversineDistanceKm(originPoint, availabilityPoint)
        })(),
        ...route,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: selectedShipment.origin,
          shipmentDestination: selectedShipment.destination,
          shipmentWeight: selectedShipment.weight,
          shipmentVolume: selectedShipment.volume ?? selectedShipment.capacity,
          shipmentDate: selectedShipment.date,
          routeFrom: route.from,
          routeTo: route.to,
          routeAvailable: route.available,
          routeVolume: route.volume ?? route.available ?? route.capacity,
          routeAvailableCity: route.availableCity,
          routeDeparture: route.routeDateRaw || route.departure,
          routePostType: route.postType,
        }),
      }))
      .sort((a, b) => {
        const aIsAvailabilityOnly = a.postType === 'availability_only'
        const bIsAvailabilityOnly = b.postType === 'availability_only'

        if (!aIsAvailabilityOnly && !bIsAvailabilityOnly) {
          return b.relevanceScore - a.relevanceScore
        }

        if (aIsAvailabilityOnly && bIsAvailabilityOnly) {
          const byDistance = (a.availabilityDistanceKm ?? Number.MAX_SAFE_INTEGER) - (b.availabilityDistanceKm ?? Number.MAX_SAFE_INTEGER)
          if (byDistance !== 0) return byDistance
          return b.relevanceScore - a.relevanceScore
        }

        return aIsAvailabilityOnly ? 1 : -1
      })
    : []

  const visibleShipmentRelevantRoutes = selectedShipment
    ? shipmentRelevantRoutes.filter((route) => {
      if (relevantRouteFilter === 'availability_only') return route.postType === 'availability_only'
      if (relevantRouteFilter === 'full_route') return route.postType !== 'availability_only'
      return true
    })
    : []

  const visibleShipmentFullRoutes = selectedShipment
    ? visibleShipmentRelevantRoutes.filter((route) => route.postType !== 'availability_only')
    : []

  const visibleShipmentAvailabilityOnlyRoutes = selectedShipment
    ? visibleShipmentRelevantRoutes.filter((route) => route.postType === 'availability_only')
    : []

  const routeRelevantShipments = selectedRoute
    ? shipmentItems
      .map(shipment => ({
        ...shipment,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: shipment.origin,
          shipmentDestination: shipment.destination,
          shipmentWeight: shipment.weight,
          shipmentVolume: shipment.volume ?? shipment.capacity,
          shipmentDate: shipment.date,
          routeFrom: selectedRoute.from,
          routeTo: selectedRoute.to,
          routeAvailable: selectedRoute.available,
          routeVolume: selectedRoute.volume ?? selectedRoute.available ?? selectedRoute.capacity,
          routeAvailableCity: selectedRoute.availableCity,
          routeDeparture: selectedRoute.routeDateRaw || selectedRoute.departure,
          routePostType: selectedRoute.postType,
        }),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    : []

  const handleSaveShipmentEdit = async () => {
    if (!selectedShipment) return
    setIsSavingEdit(true)
    try {
      await onUpdateShipment?.(selectedShipment.id, shipmentDraft)
      setIsEditingShipment(false)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleSaveRouteEdit = async () => {
    if (!selectedRoute) return
    setIsSavingEdit(true)
    try {
      await onUpdateRoute?.(selectedRoute.id, routeDraft)
      setIsEditingRoute(false)
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Post Details', 'Details de la publication')}</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">
            {selectedShipment ? selectedShipment.id : selectedRoute.id}
          </h1>
        </div>
        <button onClick={onClose} className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium">
          {t('Back', 'Retour')}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {selectedShipment && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t('Shipment Information', 'Informations expedition')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Item', 'Article')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.itemName || t('N/A', 'N/A')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Category', 'Categorie')}</p>
                <p className="text-sm font-semibold text-foreground mt-1 capitalize">{selectedShipment.category || selectedShipment.type || t('General', 'General')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.weight ? formatWeightKg(selectedShipment.weight) : t('N/A', 'N/A')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Departure city', 'Ville de depart')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.origin}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Destination city', 'Ville de destination')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.destination}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Date', 'Date')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.date || t('N/A', 'N/A')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Dimensions', 'Dimensions')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{(selectedShipment.volume || selectedShipment.capacity) ? formatVolumeM3(selectedShipment.volume || selectedShipment.capacity) : t('N/A', 'N/A')}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">{t('Notes', 'Notes')}</p>
              <p className="text-sm text-foreground mt-2">{selectedShipment.description || t('No notes provided.', 'Aucune note fournie.')}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">{t('Status Timeline', 'Historique des statuts')}</p>
              <div className="mt-3 space-y-2">
                {ensureShipmentStatusHistory(selectedShipment).map((entry, index) => (
                  <div key={`${selectedShipment.id}-status-${index}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground font-semibold capitalize">{String(entry.status || '').replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{formatStatusTimestamp(entry.at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedShipmentIsMine ? (
                <>
                  <button
                    onClick={() => setIsEditingShipment((prev) => !prev)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    {isEditingShipment ? t('Cancel Edit', 'Annuler la modification') : t('Edit Post', 'Modifier la publication')}
                  </button>
                  <button
                    onClick={() => advanceShipmentStatus(selectedShipment.id)}
                    disabled={!getNextShipmentStatus(selectedShipment.status)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {getShipmentStatusActionLabel(selectedShipment.status)}
                  </button>
                  <button
                    onClick={() => deleteShipment(selectedShipment.id)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    {t('Delete Post', 'Supprimer la publication')}
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('Invitations are only available from your own post details.', 'Les invitations sont disponibles uniquement depuis les details de votre propre publication.')}</p>
              )}
            </div>

            {selectedShipmentIsMine && isEditingShipment && (
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">{t('Edit shipment post', 'Modifier la publication livraison')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Item name', 'Nom de l article')}</label>
                    <input value={shipmentDraft.itemName} onChange={(e) => setShipmentDraft((prev) => ({ ...prev, itemName: e.target.value }))} placeholder={t('Item name', 'Nom de l article')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Category', 'Categorie')}</label>
                    <select
                      value={shipmentDraft.category}
                      onChange={(e) => setShipmentDraft((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">{t('General Goods', 'Marchandises generales')}</option>
                      <option value="furniture">{t('Furniture', 'Meubles')}</option>
                      <option value="appliances">{t('Appliances', 'Appareils menagers')}</option>
                      <option value="fragile">{t('Fragile', 'Fragile')}</option>
                      <option value="perishable">{t('Perishable', 'Perissable')}</option>
                      <option value="hazardous">{t('Hazardous', 'Dangereux')}</option>
                      <option value="electronics">{t('Electronics', 'Electronique')}</option>
                      <option value="construction">{t('Construction Materials', 'Materiaux de construction')}</option>
                      <option value="other">{t('Other', 'Autre')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Departure city', 'Ville de depart')}</label>
                    <WilayaSelector value={shipmentDraft.origin} onChange={(val) => setShipmentDraft((prev) => ({ ...prev, origin: val }))} placeholder={t('Departure city', 'Ville de depart')} className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Destination city', 'Ville de destination')}</label>
                    <WilayaSelector value={shipmentDraft.destination} onChange={(val) => setShipmentDraft((prev) => ({ ...prev, destination: val }))} placeholder={t('Destination city', 'Ville de destination')} className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Weight (kg)', 'Poids (kg)')}</label>
                    <input type="number" value={shipmentDraft.weight} onChange={(e) => setShipmentDraft((prev) => ({ ...prev, weight: e.target.value }))} placeholder={t('Weight (kg)', 'Poids (kg)')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Dimensions (m³)', 'Dimensions (m³)')}</label>
                    <input type="number" value={shipmentDraft.capacity} onChange={(e) => setShipmentDraft((prev) => ({ ...prev, capacity: e.target.value }))} placeholder={t('Dimensions (m³)', 'Dimensions (m³)')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('Delivery date', 'Date de livraison')}</label>
                    <input type="date" value={shipmentDraft.date} onChange={(e) => setShipmentDraft((prev) => ({ ...prev, date: e.target.value }))} placeholder={t('Delivery date', 'Date de livraison')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm md:w-1/2" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('Description', 'Description')}</label>
                  <textarea value={shipmentDraft.description} onChange={(e) => setShipmentDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder={t('Description', 'Description')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm min-h-[80px]" />
                </div>
                <button
                  onClick={handleSaveShipmentEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60"
                >
                  {isSavingEdit ? t('Saving...', 'Enregistrement...') : t('Save Changes', 'Enregistrer les modifications')}
                </button>
              </div>
            )}
          </div>
        )}

        {selectedRoute && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t('Availability Post Information', 'Informations publication disponibilite')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Post Type', 'Type de publication')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.postType === 'availability_only' ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}</p>
              </div>
              {selectedRoute.postType === 'availability_only' ? (
                <>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('Available city', 'Ville disponible')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.availableCity || selectedRoute.from}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('Availability dates', 'Dates de disponibilité')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {selectedRoute.availabilityStartDate || t('N/A', 'N/A')} {t('to', 'au')} {selectedRoute.availabilityEndDate || t('N/A', 'N/A')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('Departure city', 'Ville de départ')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.from}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('Destination city', 'Ville de destination')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.to}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t('Departure date', 'Date de départ')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.departure || t('N/A', 'N/A')}</p>
                  </div>
                </>
              )}
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatWeightKg(selectedRoute.capacity)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Volume', 'Volume')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatVolumeM3(selectedRoute.volume || selectedRoute.capacity)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">{t('Vehicles', 'Vehicules')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatVehicleAllocationSummary(selectedRoute.vehicleAllocation, selectedRoute.capacity)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{formatWeightKg(selectedRoute.available)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedRouteIsMine ? (
                <>
                  <button
                    onClick={() => setIsEditingRoute((prev) => !prev)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    {isEditingRoute ? t('Cancel Edit', 'Annuler la modification') : t('Edit Post', 'Modifier la publication')}
                  </button>
                  <button
                    onClick={() => deleteRoute(selectedRoute.id)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    {t('Delete Post', 'Supprimer la publication')}
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('Invitations are only available from your own post details.', 'Les invitations sont disponibles uniquement depuis les details de votre propre publication.')}</p>
              )}
            </div>

            {selectedRouteIsMine && isEditingRoute && (
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">{t('Edit availability post', 'Modifier la publication disponibilite')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Post Type', 'Type de publication')}</label>
                    <select value={routeDraft.postType} onChange={(e) => setRouteDraft((prev) => ({ ...prev, postType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm">
                      <option value="full_route">{t('Full route', 'Trajet complet')}</option>
                      <option value="availability_only">{t('Availability only', 'Disponibilite seulement')}</option>
                    </select>
                  </div>
                  {routeDraft.postType === 'availability_only' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('Available city', 'Ville disponible')}</label>
                      <WilayaSelector value={routeDraft.availableCity} onChange={(val) => setRouteDraft((prev) => ({ ...prev, availableCity: val }))} placeholder={t('Available city', 'Ville disponible')} className="w-full" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('Departure city', 'Ville de depart')}</label>
                        <WilayaSelector value={routeDraft.from} onChange={(val) => setRouteDraft((prev) => ({ ...prev, from: val }))} placeholder={t('Departure city', 'Ville de depart')} className="w-full" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('Destination city', 'Ville de destination')}</label>
                        <WilayaSelector value={routeDraft.to} onChange={(val) => setRouteDraft((prev) => ({ ...prev, to: val }))} placeholder={t('Destination city', 'Ville de destination')} className="w-full" />
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Capacity (kg)', 'Capacite (kg)')}</label>
                    <input type="number" value={routeDraft.capacity} onChange={(e) => setRouteDraft((prev) => ({ ...prev, capacity: e.target.value }))} placeholder={t('Capacity (kg)', 'Capacite (kg)')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Volume (m³)', 'Volume (m³)')}</label>
                    <input type="number" value={routeDraft.volume} onChange={(e) => setRouteDraft((prev) => ({ ...prev, volume: e.target.value }))} placeholder={t('Volume (m³)', 'Volume (m³)')} className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('Vehicle count', 'Nombre de vehicules')}</label>
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease vehicle count"
                      onClick={() => {
                        const current = Math.max(1, Math.floor(Number(routeDraft.vehicleCount) || 1))
                        const next = Math.max(1, current - 1)
                        setRouteDraft((prev) => ({
                          ...prev,
                          vehicleCount: String(next),
                          vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, next),
                        }))
                      }}
                      className="px-3 py-2 bg-card border border-border rounded-lg text-foreground hover:bg-card/80"
                    >-</button>

                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      value={routeDraft.vehicleCount}
                      onChange={(e) => {
                        const nextCount = Math.max(1, Math.floor(parseNumericInput(e.target.value) || 1))
                        setRouteDraft((prev) => ({
                          ...prev,
                          vehicleCount: String(nextCount),
                          vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, nextCount),
                        }))
                      }}
                      placeholder={t('Vehicle count', 'Nombre de vehicules')}
                      className="w-20 text-center px-3 py-2 rounded-lg border border-border bg-card text-sm"
                      step="1"
                    />

                    <button
                      type="button"
                      aria-label="Increase vehicle count"
                      onClick={() => {
                        const current = Math.max(1, Math.floor(Number(routeDraft.vehicleCount) || 1))
                        const next = current + 1
                        setRouteDraft((prev) => ({
                          ...prev,
                          vehicleCount: String(next),
                          vehicleAllocations: resizeVehicleAllocationInputs(prev.vehicleAllocations, next),
                        }))
                      }}
                      className="px-3 py-2 bg-card border border-border rounded-lg text-foreground hover:bg-card/80"
                    >+</button>
                  </div>
                  </div>
                  {routeDraft.postType === 'availability_only' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('Available from', 'Disponible du')}</label>
                        <input
                          type="date"
                          min={todayString}
                          value={routeDraft.availabilityStartDate}
                          onChange={(e) => setRouteDraft((prev) => ({ ...prev, availabilityStartDate: e.target.value }))}
                          placeholder={t('Available from', 'Disponible du')}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t('Available until', 'Disponible jusqu au')}</label>
                        <input
                          type="date"
                          min={routeDraft.availabilityStartDate || todayString}
                          value={routeDraft.availabilityEndDate}
                          onChange={(e) => setRouteDraft((prev) => ({ ...prev, availabilityEndDate: e.target.value }))}
                          placeholder={t('Available until', 'Disponible jusqu au')}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t('Departure date', 'Date de depart')}</label>
                      <input 
                        type="date"
                        min={todayString}
                        value={routeDraft.departure} 
                        onChange={(e) => setRouteDraft((prev) => ({ ...prev, departure: e.target.value }))} 
                        placeholder={t('Departure date', 'Date de depart')} 
                        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm" 
                      />
                    </div>
                  )}
                  <div className="md:col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t('Split the total capacity across the vehicles below. The sum must match the total capacity.', 'Repartissez la capacite totale entre les vehicules ci-dessous. La somme doit correspondre a la capacite totale.')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {routeDraft.vehicleAllocations.map((allocationValue, index) => (
                        <div key={`route-edit-vehicle-${index}`}>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">{t(`Vehicle ${index + 1}`, `Vehicule ${index + 1}`)}</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={allocationValue.type}
                              onChange={(e) => {
                                const nextType = e.target.value
                                setRouteDraft((prev) => ({
                                  ...prev,
                                  vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                    currentIndex === index ? { ...currentValue, type: nextType } : currentValue
                                  )),
                                }))
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                            >
                              {VEHICLE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{t(option.en, option.fr)}</option>
                              ))}
                            </select>
                            <input
                              value={allocationValue.capacity}
                              onChange={(e) => {
                                const nextValue = e.target.value
                                setRouteDraft((prev) => ({
                                  ...prev,
                                  vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                    currentIndex === index ? { ...currentValue, capacity: nextValue } : currentValue
                                  )),
                                }))
                              }}
                              type="number"
                              min="1"
                              placeholder={t('Capacity (kg)', 'Capacite (kg)')}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                              step="1"
                            />
                            <input
                              value={allocationValue.volume || ''}
                              onChange={(e) => {
                                const nextValue = e.target.value
                                setRouteDraft((prev) => ({
                                  ...prev,
                                  vehicleAllocations: prev.vehicleAllocations.map((currentValue, currentIndex) => (
                                    currentIndex === index ? { ...currentValue, volume: nextValue } : currentValue
                                  )),
                                }))
                              }}
                              type="number"
                              min="0"
                              placeholder={t('Volume (m³)', 'Volume (m³)')}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
                              step="0.1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSaveRouteEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60"
                >
                  {isSavingEdit ? t('Saving...', 'Enregistrement...') : t('Save Changes', 'Enregistrer les modifications')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {canViewRelevantSection && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {selectedShipment ? t('All Availability Posts (sorted by relevance)', 'Toutes les publications disponibilite (tries par pertinence)') : t('All Delivery Posts (sorted by relevance)', 'Toutes les publications livraison (tries par pertinence)')}
          </h2>
          {selectedShipment && (
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
              <button
                onClick={() => setRelevantRouteFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${relevantRouteFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
              >
                {t('All', 'Tous')}
              </button>

              <button
                onClick={() => setRelevantRouteFilter('availability_only')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${relevantRouteFilter === 'availability_only' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
              >
                {t('Availability only', 'Disponibilite seulement')}
              </button>
              <button
                onClick={() => setRelevantRouteFilter('full_route')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${relevantRouteFilter === 'full_route' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
              >
                {t('Full route', 'Trajet complet')}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {selectedShipment && (
            <div className="space-y-6">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsFullRouteSectionOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-left"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('Full Route Posts', 'Publications trajet complet')}
                  </h3>
                  {isFullRouteSectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isFullRouteSectionOpen && (visibleShipmentFullRoutes.length > 0 ? visibleShipmentFullRoutes.map(route => (
                  <div key={route.id} className="rounded-xl border border-border bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-base font-bold text-foreground">{route.id}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                          {t('Full route', 'Trajet complet')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-4">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Departure city</p>
                        <p className="font-semibold text-foreground mt-1">{route.from}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Destination city</p>
                        <p className="font-semibold text-foreground mt-1">{route.to}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                        <p className="font-semibold text-foreground mt-1">{formatWeightKg(route.available)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Departure date</p>
                        <p className="font-semibold text-foreground mt-1">{route.departure}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}</p>
                        <p className="font-semibold text-foreground mt-1">{route.driverName || t('Unknown driver', 'Conducteur inconnu')}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => contactShipper(route, 'community_shipment', selectedShipment)}
                      disabled={isInvitationSent?.('community_route', route?.id || 'none')}
                      className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('community_route', route?.id || 'none') ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                    >
                      {isInvitationSent?.('community_route', route?.id || 'none') ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {t('No relevant full-route posts found.', 'Aucune publication trajet complet pertinente trouvee.')}
                  </p>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAvailabilityOnlySectionOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-left"
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('Availability Only Posts', 'Publications disponibilite uniquement')}
                  </h3>
                  {isAvailabilityOnlySectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isAvailabilityOnlySectionOpen && (visibleShipmentAvailabilityOnlyRoutes.length > 0 ? visibleShipmentAvailabilityOnlyRoutes.map(route => (
                  <div key={route.id} className="rounded-xl border border-border bg-muted p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-base font-bold text-foreground">{route.id}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
                          {t('Availability only', 'Disponibilite seulement')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-4">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Available on city', 'Disponible sur la ville')}</p>
                        <p className="font-semibold text-foreground mt-1">{route.availableCity || route.from || t('N/A', 'N/A')}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Distance from pickup', 'Distance depuis la ville de depart')}</p>
                        <p className="font-semibold text-foreground mt-1">{Number.isFinite(route.availabilityDistanceKm) ? `${Math.round(route.availabilityDistanceKm)} km` : t('N/A', 'N/A')}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                        <p className="font-semibold text-foreground mt-1">{formatWeightKg(route.available)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Availability date', 'Date de disponibilite')}</p>
                        <p className="font-semibold text-foreground mt-1">{route.departure}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}</p>
                        <p className="font-semibold text-foreground mt-1">{route.driverName || t('Unknown driver', 'Conducteur inconnu')}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => contactShipper(route, 'community_shipment', selectedShipment)}
                      disabled={isInvitationSent?.('community_route', route?.id || 'none')}
                      className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('community_route', route?.id || 'none') ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                    >
                      {isInvitationSent?.('community_route', route?.id || 'none') ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">
                    {t('No relevant availability-only posts found.', 'Aucune publication disponibilite uniquement pertinente trouvee.')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {selectedRoute && routeRelevantShipments.length > 0 && routeRelevantShipments.map(shipment => (
            <div key={shipment.id} className="rounded-xl border border-border bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-base font-bold text-foreground">{shipment.id}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Product', 'Produit')}</p>
                  <p className="font-semibold text-foreground mt-1">{shipment.itemName || t('N/A', 'N/A')}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}</p>
                  <p className="font-semibold text-foreground mt-1">{formatWeightKg(shipment.weight)}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Departure city</p>
                  <p className="font-semibold text-foreground mt-1">{shipment.origin}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Destination city</p>
                  <p className="font-semibold text-foreground mt-1">{shipment.destination}</p>
                </div>
              </div>

              <button
                onClick={() => contactShipper(shipment, 'community_route', selectedRoute)}
                disabled={isInvitationSent?.('community_shipment', shipment?.id || 'none')}
                className={`mt-3 w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('community_shipment', shipment?.id || 'none') ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {isInvitationSent?.('community_shipment', shipment?.id || 'none') ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
              </button>
            </div>
          ))}

          {selectedRoute && routeRelevantShipments.length === 0 && <p className="text-sm text-muted-foreground">{t('No relevant delivery posts found.', 'Aucune publication de livraison pertinente trouvee.')}</p>}
        </div>
        </div>
      )}
    </>
  )
}
