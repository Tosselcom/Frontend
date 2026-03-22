'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import axios from 'axios'
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
  Clock,
  Trash2,
  Plus,
  ChevronRight,
} from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { getApiUrl } from '@/lib/api'

const DEFAULT_USER = { name: 'John User', email: 'john@tosselcom.com', role: 'shared', photo: '' }
const SHIPMENT_STATUS_FLOW = ['posted', 'matched', 'in_transit', 'delivered']

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
  if (typeof window === 'undefined') return DEFAULT_USER

  const userStr = sessionStorage.getItem('user')
  if (!userStr) return DEFAULT_USER

  try {
    return JSON.parse(userStr)
  } catch {
    return DEFAULT_USER
  }
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

function mapDeliveryPostFromDb(row) {
  return {
    id: `SHP-DB-${row.id}`,
    dbId: row.id,
    itemName: row.itemName,
    origin: row.origin,
    destination: row.destination,
    weight: String(row.weight ?? ''),
    capacity: String(row.volume ?? ''),
    quantity: String(row.quantity ?? 1),
    dimensions: 'N/A',
    category: row.itemCategory || 'general',
    description: row.description || '',
    type: row.itemCategory || 'general',
    photo: '',
    date: row.deliveryDate || formatDateDisplay(row.created_at),
    status: 'posted',
    statusHistory: [{ status: 'posted', at: row.created_at || new Date().toISOString() }],
    ownerId: row.ownerEmail || String(row.user_id || ''),
    ownerName: row.ownerName || row.ownerEmail || 'Unknown user',
  }
}

function mapAvailabilityPostFromDb(row) {
  return {
    id: `ROUTE-DB-${row.id}`,
    dbId: row.id,
    from: row.origin,
    to: row.destination,
    capacity: String(row.capacity ?? ''),
    available: String(row.capacity ?? ''),
    stops: Number(row.numberOfStops ?? 0),
    departure: row.date || formatDateDisplay(row.created_at),
    postType: row.postType || 'full_route',
    isLive: false,
    driverName: row.ownerName || row.ownerEmail || 'Unknown user',
    currentStop: '',
    lastSeen: 'Offline',
    ownerId: row.ownerEmail || String(row.user_id || ''),
    ownerName: row.ownerName || row.ownerEmail || 'Unknown user',
  }
}

function getUserOwnerKey(userValue) {
  return String(userValue?.email || userValue?.name || '').trim().toLowerCase()
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

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(getInitialUser)
  const [uiLanguage, setUiLanguage] = useState(getInitialDashboardLanguage)
  const currentUserKey = useMemo(() => getUserOwnerKey(user), [user])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [role] = useState('shared')
  const [activeSection, setActiveSection] = useState('overview')
  const [routeTypeFilter, setRouteTypeFilter] = useState('all')
  const [shipmentOriginFilter, setShipmentOriginFilter] = useState('')
  const [shipmentDestinationFilter, setShipmentDestinationFilter] = useState('')
  const [shipmentCapacityFilter, setShipmentCapacityFilter] = useState('')
  const [routeOriginFilter, setRouteOriginFilter] = useState('')
  const [routeDestinationFilter, setRouteDestinationFilter] = useState('')
  const [routeCapacityFilter, setRouteCapacityFilter] = useState('')
  const [detailView, setDetailView] = useState({ type: null, id: null })
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [isSubmittingShipment, setIsSubmittingShipment] = useState(false)
  const [routePostType, setRoutePostType] = useState('full_route')
  const [formData, setFormData] = useState({ from: '', to: '', capacity: '', stops: '', departure: '' })
  const [shipmentFormData, setShipmentFormData] = useState({
    itemName: '',
    origin: '',
    destination: '',
    weight: '',
    capacity: '',
    deliveryDate: '',
    quantity: '1',
    dimensions: '',
    category: 'general',
    description: '',
    photo: '',
  })
  
  // Data State
  const [shipmentItems, setShipmentItems] = useState([
    {
      id: 'SHP-2024-001',
      itemName: 'Glass dining table set',
      origin: 'Alger',
      destination: 'Oran',
      weight: '1,500 kg',
      capacity: '2.5',
      quantity: '1 set',
      dimensions: '220 x 110 x 85 cm',
      category: 'fragile',
      description: 'Packed with corner protection and wrap film.',
      type: 'fragile',
      photo: '',
      date: getDemoDateLabel(1, 20),
      status: 'matched',
      ownerId: 'sara@partner-logistics.com',
      ownerName: 'Sara M.',
    },
    {
      id: 'SHP-2024-002',
      itemName: 'Wooden bed frame',
      origin: 'Constantine',
      destination: 'Blida',
      weight: '2,300 kg',
      capacity: '4.2',
      quantity: '12 units',
      dimensions: '200 x 160 x 35 cm',
      category: 'furniture',
      description: 'Stacked on pallets. Keep dry during transport.',
      type: 'standard',
      photo: '',
      date: getDemoDateLabel(1, 21),
      status: 'posted',
      ownerId: DEFAULT_USER.email,
      ownerName: DEFAULT_USER.name,
    },
    {
      id: 'SHP-2024-003',
      itemName: 'Fresh dairy products',
      origin: 'Bouira',
      destination: 'Tizi Ouzou',
      weight: '1,800 kg',
      capacity: '1.8',
      quantity: '84 boxes',
      dimensions: 'N/A',
      category: 'perishable',
      description: 'Temperature-controlled transport required.',
      type: 'perishable',
      photo: '',
      date: getDemoDateLabel(1, 22),
      status: 'in_transit',
      ownerId: 'amine@north-transport.com',
      ownerName: 'Amine S.',
    },
  ])
  
  const [routeItems, setRouteItems] = useState([
    { id: 'ROUTE-001', from: 'Alger', to: 'Oran', capacity: '3.0', available: '1.5', stops: 3, departure: getDemoDateLabel(1, 23), postType: 'full_route', isLive: true, driverName: 'Youcef B.', currentStop: 'Blida', lastSeen: '2 min ago', ownerId: 'youcef@west-fleet.com', ownerName: 'Youcef B.' },
    { id: 'ROUTE-002', from: 'Constantine', to: 'Blida', capacity: '2.5', available: '2.0', stops: 2, departure: getDemoDateLabel(1, 24), postType: 'full_route', isLive: false, driverName: 'Nassim K.', currentStop: '', lastSeen: 'Offline', ownerId: DEFAULT_USER.email, ownerName: DEFAULT_USER.name },
    { id: 'ROUTE-003', from: 'Bouira', to: 'Tizi Ouzou', capacity: '3.5', available: '1.2', stops: 4, departure: getDemoDateLabel(1, 25), postType: 'full_route', isLive: true, driverName: 'Amine S.', currentStop: 'Lakhdaria', lastSeen: '5 min ago', ownerId: 'amine@north-transport.com', ownerName: 'Amine S.' },
  ])
  
  const [matchingItems, setMatchingItems] = useState([
    {
      id: 'MATCH-001',
      percentage: 92,
      type: 'new',
      direction: 'shipper_to_trucker',
      description: 'Alger -> Oran route has 1.5 tons free capacity. Invite this driver for your delivery post.',
      invited: false,
      accepted: false,
    },
    {
      id: 'MATCH-002',
      percentage: 87,
      type: 'older',
      direction: 'trucker_to_shipper',
      description: 'Constantine -> Blida driver is available and fits your cargo date and size.',
      invited: false,
      accepted: false,
    },
  ])
  const [receivedInvitations, setReceivedInvitations] = useState([
    {
      id: 'INV-001',
      senderRole: 'trucker',
      senderName: 'Nassim K.',
      linkedPostType: 'route',
      linkedPostId: 'ROUTE-001',
      status: 'pending',
      receivedAt: '09:20 AM',
      message: 'I can take your delivery on my current route.',
    },
    {
      id: 'INV-002',
      senderRole: 'client',
      senderName: 'Sara M.',
      linkedPostType: 'shipment',
      linkedPostId: 'SHP-2024-002',
      status: 'pending',
      receivedAt: '10:05 AM',
      message: 'Can you confirm availability for this shipment?',
    },
  ])
  const [selectedInvitationId, setSelectedInvitationId] = useState('INV-001')
  const [sentInvitationKeys, setSentInvitationKeys] = useState({})
  
  const [baseNotifications, setBaseNotifications] = useState([
    {
      id: 'NOT-001',
      title: 'New shipment match',
      description: 'Route matches 92% with your load',
      eventType: 'relevant_post_found',
      targetRole: 'shipper',
    },
    {
      id: 'NOT-002',
      title: 'Pickup confirmed',
      description: 'Shipment #SHP-2024-002 picked up',
      eventType: 'shipment_status_updated',
      targetRole: 'shipper',
    },
    {
      id: 'NOT-003',
      title: 'Delivery completed',
      description: 'Package arrived at destination',
      eventType: 'shipment_status_updated',
      targetRole: 'shipper',
    },
  ])
  const [readNotificationIds, setReadNotificationIds] = useState([])

  const myShipmentItems = useMemo(
    () => shipmentItems.filter((shipment) => (
      getUserOwnerKey({ email: shipment.ownerId, name: shipment.ownerName }) === currentUserKey
    )),
    [shipmentItems, currentUserKey],
  )

  const myRouteItems = useMemo(
    () => routeItems.filter((route) => (
      getUserOwnerKey({ email: route.ownerId, name: route.ownerName }) === currentUserKey
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

  const relevantPostNotifications = useMemo(
    () => {
      const routeById = new Map(myRouteItems.map((route) => [route.id, route]))
      const shipmentById = new Map(myShipmentItems.map((shipment) => [shipment.id, shipment]))
      const generated = []

      myShipmentItems.forEach((shipment) => {
        const matchedRoutes = routeItems
          .filter((route) => {
            if (route.from !== shipment.origin || route.to !== shipment.destination) return false
            return getUserOwnerKey({ email: route.ownerId, name: route.ownerName }) !== currentUserKey
          })
          .sort((a, b) => Number(b.available || 0) - Number(a.available || 0))

        const bestRoute = matchedRoutes[0]
        if (!bestRoute) return

        generated.push({
          id: `NOT-REL-SHP-${shipment.id}-${bestRoute.id}`,
          title: 'New relevant availability post',
          description: `${bestRoute.driverName || 'A driver'} posted availability on ${bestRoute.from} -> ${bestRoute.to} for ${shipment.id}.`,
          eventType: 'relevant_post_found',
          targetRole: 'shipper',
          linkedPostType: 'shipment',
          linkedPostId: shipment.id,
          deepLink: {
            section: 'shipments',
            detailType: 'shipment',
            detailId: shipment.id,
          },
        })
      })

      myRouteItems.forEach((route) => {
        if (route.postType !== 'full_route') return

        const matchedShipments = shipmentItems
          .filter((shipment) => {
            if (shipment.origin !== route.from || shipment.destination !== route.to) return false
            return getUserOwnerKey({ email: shipment.ownerId, name: shipment.ownerName }) !== currentUserKey
          })
          .sort((a, b) => {
            const aWeight = Number.parseFloat((a.weight || '0').replace(',', '.')) || 0
            const bWeight = Number.parseFloat((b.weight || '0').replace(',', '.')) || 0
            return bWeight - aWeight
          })

        const bestShipment = matchedShipments[0]
        if (!bestShipment) return

        generated.push({
          id: `NOT-REL-ROUTE-${route.id}-${bestShipment.id}`,
          title: 'New relevant delivery request',
          description: `${bestShipment.itemName} (${bestShipment.id}) matches your route ${route.from} -> ${route.to}.`,
          eventType: 'relevant_post_found',
          targetRole: 'trucker',
          linkedPostType: 'route',
          linkedPostId: route.id,
          deepLink: {
            section: 'routes',
            detailType: 'route',
            detailId: route.id,
          },
        })
      })

      return generated.filter((notification) => {
        if (notification.linkedPostType === 'route') {
          return routeById.has(notification.linkedPostId)
        }
        if (notification.linkedPostType === 'shipment') {
          return shipmentById.has(notification.linkedPostId)
        }
        return true
      })
    },
    [routeItems, shipmentItems, myRouteItems, myShipmentItems, currentUserKey],
  )

  const notifications = useMemo(
    () => [...invitationNotifications, ...relevantPostNotifications, ...baseNotifications].map((notification) => ({
      ...notification,
      isRead: readNotificationIds.includes(notification.id),
    })),
    [invitationNotifications, relevantPostNotifications, baseNotifications, readNotificationIds],
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
    const token = getStoredToken()
    if (!token) return

    const fetchPostsFromDb = async () => {
      try {
        const [allDeliveryRes, allAvailabilityRes, myDeliveryRes, myAvailabilityRes] = await Promise.all([
          axios.get(getApiUrl('/posts/delivery'), { headers: { token } }),
          axios.get(getApiUrl('/posts/availability'), { headers: { token } }),
          axios.get(getApiUrl('/posts/delivery/mine'), { headers: { token } }),
          axios.get(getApiUrl('/posts/availability/mine'), { headers: { token } }),
        ])

        const allDeliveryRows = Array.isArray(allDeliveryRes.data) ? allDeliveryRes.data : []
        const allAvailabilityRows = Array.isArray(allAvailabilityRes.data) ? allAvailabilityRes.data : []
        const myDeliveryRows = Array.isArray(myDeliveryRes.data) ? myDeliveryRes.data : []
        const myAvailabilityRows = Array.isArray(myAvailabilityRes.data) ? myAvailabilityRes.data : []

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

        setShipmentItems(mergedDeliveryRows.map(mapDeliveryPostFromDb))
        setRouteItems(mergedAvailabilityRows.map(mapAvailabilityPostFromDb))
      } catch (error) {
        pushNotification(error?.response?.data?.message || 'Failed to fetch posts from database')
      }
    }

    fetchPostsFromDb()
  }, [])

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
      quantity: '1',
      dimensions: '',
      category: 'general',
      description: '',
      photo: '',
    })
  }

  const handleShipmentPhotoUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      pushNotification('Please upload a valid image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setShipmentFormData(prev => ({ ...prev, photo: reader.result }))
    }
    reader.readAsDataURL(file)
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
    const quantityValue = parseNumericInput(shipmentFormData.quantity || '1')

    console.log('Parsed values - Weight:', weightValue, 'Volume:', volumeValue, 'Quantity:', quantityValue)

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

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      const msg = 'Quantity must be a valid number greater than 0'
      console.warn('Quantity validation failed:', msg, 'Value:', quantityValue)
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
      quantity: Math.round(quantityValue),
      itemCategory: shipmentFormData.category || 'general',
      description: shipmentFormData.description || '',
    }

    console.log('Sending payload to backend:', payload)

    try {
      setIsSubmittingShipment(true)
      const apiUrl = getApiUrl('/posts/delivery')
      console.log('API URL:', apiUrl)
      
      const response = await axios.post(apiUrl, payload, {
        headers: { token },
      })

      console.log('Delivery post created successfully:', response.data)

      const createdId = response.data?.postId

      const newShipment = {
        id: createdId ? `SHP-DB-${createdId}` : `SHP-2024-${String(shipmentItems.length + 1).padStart(3, '0')}`,
        itemName: shipmentFormData.itemName,
        origin: shipmentFormData.origin,
        destination: shipmentFormData.destination,
        weight: shipmentFormData.weight,
        capacity: shipmentFormData.capacity,
        quantity: shipmentFormData.quantity || '1',
        dimensions: shipmentFormData.dimensions || 'N/A',
        category: shipmentFormData.category,
        description: shipmentFormData.description || '',
        type: shipmentFormData.category,
        photo: shipmentFormData.photo,
        date: shipmentFormData.deliveryDate,
        status: 'posted',
        statusHistory: [{ status: 'posted', at: new Date().toISOString() }],
        ownerId: currentUserKey,
        ownerName: user?.name || 'Current user',
      }

      setShipmentItems(prev => [newShipment, ...prev])
      pushNotification(`Delivery post created: ${newShipment.id}`)
      alert('Delivery post created successfully')
      closeShipmentModal()
    } catch (error) {
      console.error('Error creating delivery post:', error)
      const message = error?.response?.data?.message || error?.message || 'Failed to create delivery post'
      console.error('Error message:', message)
      pushNotification(message)
      alert(`Error: ${message}`)
    } finally {
      setIsSubmittingShipment(false)
    }
  }

  const handlePostRoute = (type = 'full_route') => {
    setRoutePostType(type)
    setFormData({ from: '', to: '', capacity: '', stops: '', departure: '' })
    setShowRouteModal(true)
  }

  const handleSubmitRoute = async () => {
    if (!formData.capacity) {
      pushNotification('Please fill in capacity')
      return
    }

    if (routePostType === 'full_route' && (!formData.from || !formData.to || !formData.stops || !formData.departure)) {
      pushNotification('Please fill in all route details')
      return
    }

    const token = getStoredToken()
    if (!token) {
      pushNotification('Please login again')
      router.push('/login')
      return
    }

    const payload = {
      postType: routePostType,
      origin: routePostType === 'full_route' ? formData.from : (formData.from || 'Not specified'),
      destination: routePostType === 'full_route' ? formData.to : (formData.to || 'Not specified'),
      capacity: Number(formData.capacity),
      numberOfStops: routePostType === 'full_route' ? Number.parseInt(formData.stops || '0', 10) : 0,
      date: routePostType === 'full_route' ? formData.departure : (formData.departure || 'Flexible'),
    }

    try {
      const response = await axios.post(getApiUrl('/posts/availability'), payload, {
        headers: { token },
      })

      const createdId = response.data?.postId
    
      const newRoute = {
        id: createdId ? `ROUTE-DB-${createdId}` : `ROUTE-${String(routeItems.length + 1).padStart(3, '0')}`,
        from: routePostType === 'full_route' ? formData.from : (formData.from || 'Not specified'),
        to: routePostType === 'full_route' ? formData.to : (formData.to || 'Not specified'),
        capacity: formData.capacity,
        available: formData.capacity,
        stops: routePostType === 'full_route' ? parseInt(formData.stops, 10) : 0,
        departure: routePostType === 'full_route' ? formData.departure : (formData.departure || 'Flexible'),
        postType: routePostType,
        isLive: false,
        driverName: user?.name || 'Unknown driver',
        currentStop: '',
        lastSeen: 'Offline',
        ownerId: currentUserKey,
        ownerName: user?.name || 'Current user',
      }

      setRouteItems(prev => [newRoute, ...prev])
      pushNotification(`${routePostType === 'full_route' ? 'Route' : 'Availability'} post created: ${newRoute.id}`)
      setShowRouteModal(false)
      setRoutePostType('full_route')
      setFormData({ from: '', to: '', capacity: '', stops: '', departure: '' })
    } catch (error) {
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

  const deleteShipment = (id) => {
    setShipmentItems(shipmentItems.filter(item => item.id !== id))
    pushNotification(`Shipment ${id} deleted`)
  }

  const deleteRoute = (id) => {
    setRouteItems(routeItems.filter(item => item.id !== id))
    pushNotification(`Route ${id} deleted`)
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
    }

    setBaseNotifications(prev => [newNotification, ...prev])
    setTimeout(() => setBaseNotifications(prev => prev.filter(n => n.id !== newNotification.id)), 5000)
  }

  const handleClearNotifications = () => {
    setReadNotificationIds((prev) => {
      const allIds = notifications.map((notification) => notification.id)
      return Array.from(new Set([...prev, ...allIds]))
    })
    setBaseNotifications([])
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

  const getInvitationKey = (source, referenceId) => `${source}:${referenceId}`
  const isInvitationSent = (source, referenceId) => Boolean(sentInvitationKeys[getInvitationKey(source, referenceId)])

  useEffect(() => {
    const handleUserUpdated = (event) => {
      if (event?.detail) {
        handleUserProfileUpdate(event.detail)
      }
    }

    window.addEventListener('user:updated', handleUserUpdated)
    return () => window.removeEventListener('user:updated', handleUserUpdated)
  }, [])

  const contactShipper = (target, source = 'general') => {
    const referenceId = typeof target === 'string' ? target : target?.id
    if (!referenceId) return
    setSentInvitationKeys((prev) => ({ ...prev, [getInvitationKey(source, referenceId)]: true }))
    const actionLabel = source === 'route' ? 'Invitation sent to trucker' : 'Invitation sent'
    pushNotification(`${actionLabel}: ${referenceId}`, {
      eventType: 'invite_sent',
      targetRole: source === 'route' ? 'trucker' : 'shipper',
      deepLink: { section: 'matching' },
    })
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

  const handleAcceptReceivedInvitation = (invitationId) => {
    setReceivedInvitations((prev) => prev.map((invitation) => (
      invitation.id === invitationId
        ? { ...invitation, status: 'accepted' }
        : invitation
    )))
    pushNotification(`Invitation accepted: ${invitationId}`, {
      eventType: 'invite_accepted',
      targetRole: 'shared',
      invitationId,
      deepLink: { section: 'matching', invitationId },
    })
  }

  const handleDeclineReceivedInvitation = (invitationId) => {
    setReceivedInvitations((prev) => prev.map((invitation) => (
      invitation.id === invitationId
        ? { ...invitation, status: 'declined' }
        : invitation
    )))
    pushNotification(`Invitation declined: ${invitationId}`, {
      eventType: 'invite_declined',
      targetRole: 'shared',
      invitationId,
      deepLink: { section: 'matching', invitationId },
    })
  }

  // Section-level filters
  const filteredShipments = useMemo(() => 
    shipmentItems.filter(item => {
      const originMatches = !shipmentOriginFilter || item.origin.toLowerCase().includes(shipmentOriginFilter.toLowerCase())
      const destinationMatches = !shipmentDestinationFilter || item.destination.toLowerCase().includes(shipmentDestinationFilter.toLowerCase())
      const capacityMatches = !shipmentCapacityFilter || (parseFloat(item.capacity) || 0) <= parseFloat(shipmentCapacityFilter)
      return originMatches && destinationMatches && capacityMatches
    }), [shipmentItems, shipmentOriginFilter, shipmentDestinationFilter, shipmentCapacityFilter]
  )

  const filteredRoutes = useMemo(() => 
    routeItems.filter(item => {
      const originMatches = !routeOriginFilter || item.from.toLowerCase().includes(routeOriginFilter.toLowerCase())
      const destinationMatches = !routeDestinationFilter || item.to.toLowerCase().includes(routeDestinationFilter.toLowerCase())
      const capacityMatches = !routeCapacityFilter || (parseFloat(item.available) || 0) > parseFloat(routeCapacityFilter)

      const typeMatches =
        routeTypeFilter === 'all' ||
        (routeTypeFilter === 'availability_only' && item.postType === 'availability_only') ||
        (routeTypeFilter === 'full_route' && item.postType === 'full_route') ||
        (routeTypeFilter === 'live_truckers' && item.isLive)

      return originMatches && destinationMatches && capacityMatches && typeMatches
    }), [routeItems, routeOriginFilter, routeDestinationFilter, routeCapacityFilter, routeTypeFilter]
  )

  return (
    <div className="flex h-screen bg-background p-2.5 sm:p-4 lg:py-5 lg:px-8 xl:px-10 gap-3 sm:gap-4 lg:gap-5">
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
      <div className="hidden lg:flex lg:w-64 lg:flex-col bg-secondary border border-border rounded-2xl overflow-hidden shadow-sm">
        <DashboardSidebar
          role={role}
          uiLanguage={uiLanguage}
          hasUnreadNotifications={hasUnreadNotifications}
          notificationsCount={notifications.length}
          onOpenNotifications={handleOpenSidebarNotifications}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
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
                    <p className="text-sm lg:text-base font-semibold tracking-tight text-slate-900 leading-tight whitespace-nowrap">
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
                    shipmentOriginFilter={shipmentOriginFilter}
                    shipmentDestinationFilter={shipmentDestinationFilter}
                    shipmentCapacityFilter={shipmentCapacityFilter}
                    setShipmentOriginFilter={setShipmentOriginFilter}
                    setShipmentDestinationFilter={setShipmentDestinationFilter}
                    setShipmentCapacityFilter={setShipmentCapacityFilter}
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
                    routeOriginFilter={routeOriginFilter}
                    routeDestinationFilter={routeDestinationFilter}
                    routeCapacityFilter={routeCapacityFilter}
                    setRouteOriginFilter={setRouteOriginFilter}
                    setRouteDestinationFilter={setRouteDestinationFilter}
                    setRouteCapacityFilter={setRouteCapacityFilter}
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
                  />
                )}

                {/* Settings Section */}
                {activeSection === 'settings' && (
                  <SettingsSection
                    uiLanguage={uiLanguage}
                    onLanguagePreview={setUiLanguage}
                    user={user}
                    onUserUpdate={handleUserProfileUpdate}
                    pushNotification={pushNotification}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-foreground mb-2">{tr(uiLanguage, 'Create Post', 'Creer une publication')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{tr(uiLanguage, 'Choose ', 'Choisissez ')}<span className="font-semibold text-foreground">{tr(uiLanguage, 'Trucker - I am available', 'Transporteur - Je suis disponible')}</span>{tr(uiLanguage, ' and select the post type.', ' et selectionnez le type de publication.')}</p>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                onClick={() => setRoutePostType('full_route')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  routePostType === 'full_route' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'
                }`}
              >
                {tr(uiLanguage, 'Full Route', 'Trajet complet')}
              </button>
              <button
                onClick={() => setRoutePostType('availability_only')}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  routePostType === 'availability_only' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'
                }`}
              >
                {tr(uiLanguage, 'Availability Only', 'Disponibilite uniquement')}
              </button>
            </div>
            
            <div className="space-y-4">
              {routePostType === 'full_route' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'From (City)', 'Depuis (Ville)')}</label>
                    <input
                      type="text"
                      placeholder={tr(uiLanguage, 'e.g., Alger', 'ex. Alger')}
                      value={formData.from}
                      onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'To (City)', 'Vers (Ville)')}</label>
                    <input
                      type="text"
                      placeholder={tr(uiLanguage, 'e.g., Oran', 'ex. Oran')}
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Capacity (tons)', 'Capacite (tonnes)')}</label>
                <input
                  type="number"
                  placeholder={tr(uiLanguage, 'e.g., 3.0', 'ex. 3.0')}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  step="0.1"
                />
              </div>
              
              {routePostType === 'full_route' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Number of Stops', 'Nombre d arrets')}</label>
                  <input
                    type="number"
                    placeholder={tr(uiLanguage, 'e.g., 3', 'ex. 3')}
                    value={formData.stops}
                    onChange={(e) => setFormData({ ...formData, stops: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{routePostType === 'full_route' ? tr(uiLanguage, 'Departure Date', 'Date de depart') : tr(uiLanguage, 'Availability Date (optional)', 'Date de disponibilite (optionnelle)')}</label>
                <input
                  type="date"
                  value={formData.departure}
                  onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {routePostType === 'availability_only' && (
                <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/60 px-3 py-2">
                  {tr(uiLanguage, 'This post will publish free capacity without enforcing a full route. You can optionally add route details later.', 'Cette publication affichera la capacite libre sans imposer un trajet complet. Vous pouvez ajouter les details du trajet plus tard.')}
                </p>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRouteModal(false)
                  setRoutePostType('full_route')
                  setFormData({ from: '', to: '', capacity: '', stops: '', departure: '' })
                }}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                {tr(uiLanguage, 'Cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSubmitRoute}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'From (City)', 'Depuis (Ville)')}</label>
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'e.g., Alger', 'ex. Alger')}
                  value={shipmentFormData.origin}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, origin: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'To (City)', 'Vers (Ville)')}</label>
                <input
                  type="text"
                  placeholder={tr(uiLanguage, 'e.g., Oran', 'ex. Oran')}
                  value={shipmentFormData.destination}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, destination: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Weight', 'Poids')}</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Capacity (Cubic Meters)', 'Capacite (Metres cubes)')}</label>
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
                  value={shipmentFormData.deliveryDate}
                  onChange={(e) => setShipmentFormData({ ...shipmentFormData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Quantity', 'Quantite')}</label>
                  <input
                    type="number"
                    placeholder={tr(uiLanguage, 'e.g., 4', 'ex. 4')}
                    value={shipmentFormData.quantity}
                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Dimensions (optional)', 'Dimensions (optionnelles)')}</label>
                  <input
                    type="text"
                    placeholder={tr(uiLanguage, 'e.g., 200 x 160 x 35 cm', 'ex. 200 x 160 x 35 cm')}
                    value={shipmentFormData.dimensions}
                    onChange={(e) => setShipmentFormData({ ...shipmentFormData, dimensions: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{tr(uiLanguage, 'Item Photo (optional)', 'Photo de l article (optionnelle)')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleShipmentPhotoUpload}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-md file:bg-primary file:text-primary-foreground file:text-sm file:font-medium"
                />
                {shipmentFormData.photo && (
                  <div className="mt-3">
                    <Image
                      src={shipmentFormData.photo}
                      alt={tr(uiLanguage, 'Shipment preview', 'Apercu de la livraison')}
                      width={960}
                      height={288}
                      unoptimized
                      className="w-full h-36 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}
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
function OverviewSection({ user, uiLanguage, shipmentItems, routeItems, receivedInvitations }) {
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
        <AnalyticsCard title={t('Active Delivery Posts', 'Posts livraison actifs', '  ')} value={activeShipmentsCount} change={t('Manage in delivery section', 'Gerer dans la section livraison', '   ')} changeType="up" icon={<Package className="w-5 h-5" />} />
        <AnalyticsCard title={t('Availability Posts', 'Posts disponibilite', ' ')} value={myAvailabilityPostsCount} change={t('Manage in availability section', 'Gerer dans la section disponibilite', '   ')} changeType="up" icon={<Truck className="w-5 h-5" />} />
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
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${item.stateTone}`}>{item.state}</span>
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
  shipmentOriginFilter,
  shipmentDestinationFilter,
  shipmentCapacityFilter,
  setShipmentOriginFilter,
  setShipmentDestinationFilter,
  setShipmentCapacityFilter,
  advanceShipmentStatus,
  deleteShipment,
  contactShipper,
  toggleShipmentDetails,
  handleCreateShipment,
}) {
  const shipmentsTitle = tr(uiLanguage, 'Delivery Posts - I Need a Delivery', 'Demandes de livraison - J ai besoin d une livraison', '  -   ')
  const [shipmentViewScope, setShipmentViewScope] = useState('mine')

  const myShipments = filteredShipments.filter((shipment) => getUserOwnerKey({ email: shipment.ownerId }) === currentUserKey)
  const communityShipments = filteredShipments.filter((shipment) => getUserOwnerKey({ email: shipment.ownerId }) !== currentUserKey)
  const visibleShipments = shipmentViewScope === 'mine' ? myShipments : communityShipments

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{shipmentsTitle}</h1>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{tr(uiLanguage, 'All Delivery Requests', 'Toutes les demandes de livraison', '  ')}</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <input
            type="text"
            placeholder={tr(uiLanguage, 'Search by departure city', 'Rechercher par ville de depart', '   ')}
            value={shipmentOriginFilter}
            onChange={(e) => setShipmentOriginFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            placeholder={tr(uiLanguage, 'Search by destination city', 'Rechercher par ville de destination', '   ')}
            value={shipmentDestinationFilter}
            onChange={(e) => setShipmentDestinationFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="number"
            placeholder={tr(uiLanguage, 'Filter by capacity (max)', 'Filtrer par capacite (max)', '   ')}
            value={shipmentCapacityFilter}
            onChange={(e) => setShipmentCapacityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => {
              setShipmentOriginFilter('')
              setShipmentDestinationFilter('')
              setShipmentCapacityFilter('')
            }}
            className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
          >
            {tr(uiLanguage, 'Clear filters', 'Effacer les filtres', ' ')}
          </button>
        </div>
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
                onInvite={() => contactShipper(shipment, 'community_shipment')}
                inviteSent={shipmentViewScope === 'community' ? isInvitationSent('community_shipment', shipment.id) : false}
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
  routeOriginFilter,
  routeDestinationFilter,
  routeCapacityFilter,
  setRouteOriginFilter,
  setRouteDestinationFilter,
  setRouteCapacityFilter,
  deleteRoute,
  contactShipper,
  toggleRouteDetails,
  handlePostRoute,
}) {
  const routesTitle = tr(uiLanguage, 'Availability Posts - I am Available', 'Publications disponibilite - Je suis disponible', '  -  ')
  const [routeViewScope, setRouteViewScope] = useState('mine')

  const myRoutes = filteredRoutes.filter((route) => getUserOwnerKey({ email: route.ownerId }) === currentUserKey)
  const communityRoutes = filteredRoutes.filter((route) => getUserOwnerKey({ email: route.ownerId }) !== currentUserKey)
  const visibleRoutes = routeViewScope === 'mine' ? myRoutes : communityRoutes

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{routesTitle}</h1>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{tr(uiLanguage, 'All Trucker Posts (Availability only + Full route)', 'Toutes les publications des transporteurs (Disponibilite seule + Trajet complet)', '   (  +  )')}</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder={tr(uiLanguage, 'Search by departure city', 'Rechercher par ville de depart', '   ')}
            value={routeOriginFilter}
            onChange={(e) => setRouteOriginFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            placeholder={tr(uiLanguage, 'Search by destination city', 'Rechercher par ville de destination', '   ')}
            value={routeDestinationFilter}
            onChange={(e) => setRouteDestinationFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="number"
            placeholder={tr(uiLanguage, 'Search by capacity (cubic m)', 'Rechercher par capacite (m3)', '   ')}
            value={routeCapacityFilter}
            onChange={(e) => setRouteCapacityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => {
              setRouteOriginFilter('')
              setRouteDestinationFilter('')
              setRouteCapacityFilter('')
              setRouteTypeFilter('all')
            }}
            className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
          >
            {tr(uiLanguage, 'Clear filters', 'Effacer les filtres', ' ')}
          </button>
        </div>
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
          <button
            onClick={() => setRouteTypeFilter('live_truckers')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${routeTypeFilter === 'live_truckers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
          >
            {tr(uiLanguage, 'Live truckers', 'Transporteurs en direct', ' ')}
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
                onContact={routeViewScope === 'community' ? () => contactShipper(route, 'route') : undefined}
                contactLabel={routeViewScope === 'community' ? tr(uiLanguage, 'Send Invitation', 'Envoyer une invitation', ' ') : ''}
                contactSent={routeViewScope === 'community' ? isInvitationSent('route', route.id) : false}
                onContactRelevantShipment={routeViewScope === 'mine' ? (shipment) => contactShipper(shipment, 'route_relevant_shipment') : undefined}
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
      if (invitation.linkedPostType === 'shipment') return ownedShipmentIds.has(invitation.linkedPostId)
      if (invitation.linkedPostType === 'route') return ownedRouteIds.has(invitation.linkedPostId)
      return false
    }),
    [receivedInvitations, ownedShipmentIds, ownedRouteIds],
  )
  const selectedInvitation = visibleInvitations.find((item) => item.id === selectedInvitationId) || null
  const linkedShipment = selectedInvitation?.linkedPostType === 'shipment'
    ? shipmentItems.find((shipment) => shipment.id === selectedInvitation.linkedPostId)
    : null
  const linkedRoute = selectedInvitation?.linkedPostType === 'route'
    ? routeItems.find((route) => route.id === selectedInvitation.linkedPostId)
    : null

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
          routeDeparture: route.departure,
          routePostType: route.postType,
        }),
      }))
      .filter(route => !ownedRouteIds.has(route.id))
      .filter(route => route.relevanceScore >= 35)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    : []

  const visibleLinkedShipmentRoutes = linkedShipment
    ? (relevantRouteFilter === 'live_truckers'
      ? linkedShipmentRelevantRoutes.filter(route => route.isLive).slice(0, 3)
      : linkedShipmentRelevantRoutes.slice(0, 3))
    : []

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground">{matchingTitle}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{tr(uiLanguage, 'Invitations from clients or truckers on your own posts.', 'Invitations des clients ou transporteurs sur vos propres publications.', '      .')}</p>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-bold text-foreground mb-5">{tr(uiLanguage, 'Received Invitations', 'Invitations recues', ' ')}</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-3">
            {visibleInvitations.length > 0 ? visibleInvitations.map((invitation) => (
              <button
                key={invitation.id}
                onClick={() => handleSelectInvitation(invitation.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedInvitationId === invitation.id ? 'border-primary bg-primary/5' : 'border-border bg-muted hover:bg-muted/80'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{invitation.id}</p>
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                    invitation.status === 'accepted' ? 'bg-green-100 text-green-700' : invitation.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {invitation.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('From', 'De')}: {invitation.senderRole === 'trucker' ? t('Trucker', 'Transporteur') : t('Client', 'Client')} - {invitation.senderName}</p>
                <p className="text-xs text-muted-foreground mt-1">{invitation.receivedAt}</p>
              </button>
            )) : (
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
                      <p className="text-xs text-muted-foreground mt-1">{selectedInvitation.id} {t('received at', 'recue a')} {selectedInvitation.receivedAt}</p>
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
                  <p className="text-sm text-muted-foreground">{selectedInvitation.message}</p>
                </div>

                {linkedShipment && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">{t('Linked client post', 'Publication client liee')}</p>
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

                    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-foreground">{t('Most relevant trucker posts', 'Publications transporteurs les plus pertinentes')}</p>
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                          <button
                            onClick={() => setRelevantRouteFilter('all')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${relevantRouteFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
                          >
                            {t('All', 'Tous')}
                          </button>
                          <button
                            onClick={() => setRelevantRouteFilter('live_truckers')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${relevantRouteFilter === 'live_truckers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
                          >
                            {t('Live truckers', 'Transporteurs en direct')}
                          </button>
                        </div>
                      </div>

                      {visibleLinkedShipmentRoutes.length > 0 ? (
                        <div className="space-y-2">
                          {visibleLinkedShipmentRoutes.map((route) => (
                            <div key={route.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5 text-xs">
                              <span className="text-foreground font-medium">{route.id} - {route.from} {t('to', 'vers')} {route.to}</span>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{route.relevanceScore}% match</span>
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${route.isLive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {route.isLive ? t('Live', 'En ligne') : t('Offline', 'Hors ligne')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {relevantRouteFilter === 'live_truckers'
                            ? t('No relevant live truckers found.', 'Aucun transporteur en direct pertinent trouve.')
                            : t('No relevant trucker posts found.', 'Aucune publication de transporteur pertinente trouvee.')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {linkedRoute && (
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">{t('Linked trucker post', 'Publication transporteur liee')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Post ID', 'ID publication')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.id}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Post type', 'Type de publication')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.postType === 'availability_only' ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">Departure city</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.from}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">Destination city</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.to}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.capacity} {t('tons', 'tonnes')}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.available} {t('tons', 'tonnes')}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.driverName || t('Unknown driver', 'Conducteur inconnu')}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Live status', 'Statut en direct')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.isLive ? t('Live', 'En ligne') : t('Offline', 'Hors ligne')}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 border border-border">
                        <p className="text-xs text-muted-foreground">{t('Current stop', 'Arret actuel')}</p>
                        <p className="font-medium text-foreground mt-1">{linkedRoute.currentStop || t('N/A', 'N/A')}</p>
                      </div>
                    </div>
                  </div>
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

  const handleExportCsv = () => {
    if (typeof window === 'undefined') return

    const rows = periodShipments.map((shipment) => ({
      id: shipment.id,
      itemName: shipment.itemName,
      origin: shipment.origin,
      destination: shipment.destination,
      weight: shipment.weight,
      status: shipment.status,
      date: shipment.date,
    }))

    const headers = ['ID', 'Item', 'Origin', 'Destination', 'Weight', 'Status', 'Date']
    const csvLines = [
      headers.join(','),
      ...rows.map((row) => [
        row.id,
        row.itemName,
        row.origin,
        row.destination,
        row.weight,
        row.status,
        row.date,
      ].map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')),
    ]

    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(csvBlob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `analytics-my-posts-${periodFilter}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

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
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            {tr(uiLanguage, 'Export CSV', 'Exporter CSV', ' CSV')}
          </button>
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
function NotificationsSection({ uiLanguage, notifications, handleClearNotifications, onNotificationClick }) {
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
function SettingsSection({ uiLanguage, onLanguagePreview, user, onUserUpdate, pushNotification }) {
  const SETTINGS_STORAGE_KEY = 'tosselcom.settings.v1'
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

  const [profile, setProfile] = useState(() => {
    const merged = { ...initialProfile, ...(storedSettings?.profile || {}) }
    if (!merged.firstName && !merged.lastName) {
      const parsed = splitFullName(merged.name)
      merged.firstName = parsed.firstName
      merged.lastName = parsed.lastName
    }
    merged.name = buildFullName(merged.firstName, merged.lastName) || merged.name || ''
    return merged
  })
  const [notificationPrefs, setNotificationPrefs] = useState(() => ({ ...initialNotificationPrefs, ...(storedSettings?.notificationPrefs || {}) }))
  const [appPrefs, setAppPrefs] = useState(() => {
    const merged = { ...initialAppPrefs, ...(storedSettings?.appPrefs || {}) }
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => Boolean(storedSettings?.twoFactorEnabled))
  const [exportRequestedAt, setExportRequestedAt] = useState('')
  const [settingsSavedAt, setSettingsSavedAt] = useState(() => storedSettings?.settingsSavedAt || '')
  const [saveToast, setSaveToast] = useState(null)
  const profilePhotoInputRef = useRef(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => ({
    profile: { ...initialProfile, ...(storedSettings?.profile || {}) },
    notificationPrefs: { ...initialNotificationPrefs, ...(storedSettings?.notificationPrefs || {}) },
    appPrefs: {
      ...initialAppPrefs,
      ...(storedSettings?.appPrefs || {}),
      language: (storedSettings?.appPrefs?.language === 'French' || storedSettings?.appPrefs?.language === 'English')
        ? storedSettings.appPrefs.language
        : 'English',
    },
    twoFactorEnabled: Boolean(storedSettings?.twoFactorEnabled),
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
        <div className="fixed top-5 right-5 z-[80] w-72 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-lg p-3 animate-in fade-in slide-in-from-top duration-200">
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

function parseWeightToTons(weightValue) {
  if (!weightValue) return null
  const raw = String(weightValue).replace(/,/g, '').trim().toLowerCase()
  const numeric = parseFloat(raw)
  if (Number.isNaN(numeric)) return null
  if (raw.includes('kg')) return numeric / 1000
  return numeric
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
  shipmentDate,
  routeFrom,
  routeTo,
  routeAvailable,
  routeDeparture,
  routePostType,
}) {
  const normalizedShipmentOrigin = toNormalizedString(shipmentOrigin)
  const normalizedShipmentDestination = toNormalizedString(shipmentDestination)
  const normalizedRouteFrom = toNormalizedString(routeFrom)
  const normalizedRouteTo = toNormalizedString(routeTo)

  const originMatch = normalizedShipmentOrigin && normalizedShipmentOrigin === normalizedRouteFrom
  const destinationMatch = normalizedShipmentDestination && normalizedShipmentDestination === normalizedRouteTo
  const routeIsAvailabilityOnly = routePostType === 'availability_only'

  let routeScore = 0
  if (originMatch && destinationMatch) routeScore = 60
  else if (originMatch || destinationMatch) routeScore = 32
  else if (routeIsAvailabilityOnly) routeScore = 22

  const shipmentTons = parseWeightToTons(shipmentWeight)
  const routeAvailableTons = parseFloat(routeAvailable)
  let capacityScore = 8
  if (shipmentTons !== null && !Number.isNaN(routeAvailableTons)) {
    if (routeAvailableTons >= shipmentTons) capacityScore = 25
    else if (routeAvailableTons >= shipmentTons * 0.8) capacityScore = 12
    else capacityScore = 3
  }

  const shipmentParsedDate = parseDateSafe(shipmentDate)
  const routeParsedDate = parseDateSafe(routeDeparture)
  const dayDiff = getAbsoluteDayDiff(shipmentParsedDate, routeParsedDate)
  let dateScore = 5
  if (dayDiff !== null) {
    if (dayDiff <= 1) dateScore = 15
    else if (dayDiff <= 3) dateScore = 10
    else if (dayDiff <= 7) dateScore = 6
    else dateScore = 2
  }

  return Math.min(100, Math.max(0, Math.round(routeScore + capacityScore + dateScore)))
}

// Shipment Card Component
function ShipmentCard({ uiLanguage, id, itemName, origin, destination, weight, capacity, quantity, dimensions, category, description, date, status, type, photo, ownerName = '', ownershipTag = '', routeItems, onStatusChange, onDelete, onToggleDetails, showDetails, isReadOnly = false, showInvite = false, onInvite, inviteSent = false }) {
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
    .map(route => {
      const score = computeWeightedRouteRelevance({
        shipmentOrigin: origin,
        shipmentDestination: destination,
        shipmentWeight: weight,
        shipmentDate: date,
        routeFrom: route.from,
        routeTo: route.to,
        routeAvailable: route.available,
        routeDeparture: route.departure,
        routePostType: route.postType,
      })
      return { ...route, relevanceScore: score }
    })
    .filter(route => route.relevanceScore >= 35)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  const relevantRoutePosts = scoredRelevantRoutePosts.slice(0, 3)
  const liveRelevantRoutePosts = scoredRelevantRoutePosts
    .filter(route => route.isLive)
    .slice(0, 3)
  const visibleRelevantRoutePosts = relevantRouteFilter === 'live_truckers' ? liveRelevantRoutePosts : relevantRoutePosts

  return (
    <div className="p-4 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/30 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div onClick={onToggleDetails}>
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
              onClick={onDelete}
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
          <span className="text-foreground font-medium block">{weight}</span>
          {capacity && <span className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}: {capacity} m³</span>}
          {quantity && <span className="text-xs text-muted-foreground">{t('Qty', 'Qte')}: {quantity}</span>}
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
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border space-y-2 animate-in fade-in">
          <div className="space-y-1 pb-2">
            <p className="text-xs text-muted-foreground">{t('Item', 'Article')}: <span className="text-foreground">{itemName || t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}: <span className="text-foreground">{weight || t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}: <span className="text-foreground">{capacity ? `${capacity} m³` : t('N/A', 'N/A')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Quantity', 'Quantite')}: <span className="text-foreground">{quantity || t('N/A', 'N/A')}</span></p>
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
                  onClick={() => setRelevantRouteFilter('all')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${relevantRouteFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
                >
                  {t('All', 'Tous')}
                </button>
                <button
                  onClick={() => setRelevantRouteFilter('live_truckers')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${relevantRouteFilter === 'live_truckers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
                >
                  {t('Live truckers', 'Transporteurs en direct')}
                </button>
              </div>
            </div>
            {visibleRelevantRoutePosts.length > 0 ? (
              <div className="space-y-2">
                {visibleRelevantRoutePosts.map(route => (
                  <div key={route.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{route.id} - {route.from} {t('to', 'vers')} {route.to} {route.isLive ? `(${t('Live', 'En ligne')})` : ''}</span>
                    <span className="text-muted-foreground">{route.relevanceScore}% {t('match', 'match')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {relevantRouteFilter === 'live_truckers'
                  ? t('No relevant live truckers found.', 'Aucun transporteur en direct pertinent trouve.')
                  : t('No relevant trucker posts found for this route.', 'Aucune publication transporteur pertinente pour ce trajet.')}
              </p>
            )}
          </div>

          {showInvite && onInvite && (
            <button
              onClick={onInvite}
              disabled={inviteSent}
              className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${inviteSent ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {inviteSent ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={onStatusChange}
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
function RouteCard({ uiLanguage, id, from, to, capacity, available, stops, departure, postType = 'full_route', isLive = false, driverName = 'Unknown driver', currentStop = '', lastSeen = 'Offline', ownerName = '', ownershipTag = '', shipmentItems, onDelete, onContact, contactLabel = 'Send Invitation', contactSent = false, onContactRelevantShipment, isRelevantShipmentInvitationSent, onToggleDetails, showDetails, showNestedRelevant = true }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const capacityNum = parseFloat(capacity)
  const availableNum = parseFloat(available)
  const utilizationPercent = capacityNum > 0 ? ((capacityNum - availableNum) / capacityNum) * 100 : 0
  const isAvailabilityOnly = postType === 'availability_only'
  const relevantShipments = (shipmentItems || [])
    .map(shipment => {
      const score = computeWeightedRouteRelevance({
        shipmentOrigin: shipment.origin,
        shipmentDestination: shipment.destination,
        shipmentWeight: shipment.weight,
        shipmentDate: shipment.date,
        routeFrom: from,
        routeTo: to,
        routeAvailable: available,
        routeDeparture: departure,
        routePostType: postType,
      })
      return { ...shipment, relevanceScore: score }
    })
    .filter(shipment => shipment.relevanceScore >= 35)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)

  return (
    <div className="p-4 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div onClick={onToggleDetails} className="cursor-pointer">
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
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isLive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {isLive ? t('Live', 'En ligne') : t('Offline', 'Hors ligne')}
          </span>
          {onDelete && (
            <button
              onClick={onDelete}
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
          <span>{from} → {to}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {isAvailabilityOnly ? t('Route not specified', 'Trajet non specifie') : `${stops} ${t('stops', 'arrets')}`}
        </span>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Driver', 'Conducteur')}: {driverName}</span>
          <span className="text-muted-foreground">{lastSeen}</span>
        </div>
        {isLive && currentStop && (
          <p className="text-xs text-muted-foreground">{t('Current stop', 'Arret actuel')}: <span className="text-foreground">{currentStop}</span></p>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('Capacity', 'Capacite')}: {capacity} {t('m³', 'm³')}</span>
          <span className="text-foreground font-medium">{available} {t('m³ available', 'm³ disponibles')}</span>
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
          onClick={onContact}
          disabled={contactSent}
          className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${contactSent ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
        >
          {contactSent ? t('Invitation Sent', 'Invitation envoyee') : contactLabel}
        </button>
      )}

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('Post Type', 'Type de publication')}: <span className="text-foreground">{isAvailabilityOnly ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Route', 'Trajet')}: <span className="text-foreground">{from} {t('to', 'vers')} {to}</span></p>
            <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}: <span className="text-foreground">{capacity} {t('tons', 'tonnes')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}: <span className="text-foreground">{available} {t('tons', 'tonnes')}</span></p>
            <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}: <span className="text-foreground">{driverName}</span></p>
            <p className="text-xs text-muted-foreground">{t('Live status', 'Statut en direct')}: <span className="text-foreground">{isLive ? t('Live', 'En ligne') : t('Offline', 'Hors ligne')}</span></p>
            {isLive && currentStop && (
              <p className="text-xs text-muted-foreground">{t('Current stop', 'Arret actuel')}: <span className="text-foreground">{currentStop}</span></p>
            )}
            <p className="text-xs text-muted-foreground">{t('Stops', 'Arrets')}: <span className="text-foreground">{isAvailabilityOnly ? t('Not specified', 'Non specifie') : stops}</span></p>
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
                        <span className="text-muted-foreground">{shipment.relevanceScore}% {t('match', 'match')}</span>
                      </div>
                      {onContactRelevantShipment && (
                        <button
                          onClick={() => onContactRelevantShipment(shipment)}
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

function PostDetailPage({ uiLanguage, detailView, shipmentItems, routeItems, currentUserKey, onClose, advanceShipmentStatus, deleteShipment, deleteRoute, contactShipper, isInvitationSent }) {
  const t = (en, fr, ar = en) => tr(uiLanguage, en, fr, ar)
  const [relevantRouteFilter, setRelevantRouteFilter] = useState('all')
  if (!detailView?.type || !detailView?.id) return null

  const selectedShipment = detailView.type === 'shipment'
    ? shipmentItems.find(item => item.id === detailView.id)
    : null
  const selectedRoute = detailView.type === 'route'
    ? routeItems.find(item => item.id === detailView.id)
    : null

  if (!selectedShipment && !selectedRoute) return null

  const selectedShipmentIsMine = selectedShipment
    ? getUserOwnerKey({ email: selectedShipment.ownerId }) === currentUserKey
    : false
  const selectedRouteIsMine = selectedRoute
    ? getUserOwnerKey({ email: selectedRoute.ownerId }) === currentUserKey
    : false
  const canViewRelevantSection = selectedShipment ? selectedShipmentIsMine : selectedRouteIsMine

  const shipmentRelevantRoutes = selectedShipment
    ? routeItems
      .map(route => ({
        ...route,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: selectedShipment.origin,
          shipmentDestination: selectedShipment.destination,
          shipmentWeight: selectedShipment.weight,
          shipmentDate: selectedShipment.date,
          routeFrom: route.from,
          routeTo: route.to,
          routeAvailable: route.available,
          routeDeparture: route.departure,
          routePostType: route.postType,
        }),
      }))
      .filter(route => route.relevanceScore >= 35)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    : []

  const visibleShipmentRelevantRoutes = selectedShipment
    ? (relevantRouteFilter === 'live_truckers'
      ? shipmentRelevantRoutes.filter(route => route.isLive).slice(0, 5)
      : shipmentRelevantRoutes.slice(0, 5))
    : []

  const routeRelevantShipments = selectedRoute
    ? shipmentItems
      .map(shipment => ({
        ...shipment,
        relevanceScore: computeWeightedRouteRelevance({
          shipmentOrigin: shipment.origin,
          shipmentDestination: shipment.destination,
          shipmentWeight: shipment.weight,
          shipmentDate: shipment.date,
          routeFrom: selectedRoute.from,
          routeTo: selectedRoute.to,
          routeAvailable: selectedRoute.available,
          routeDeparture: selectedRoute.departure,
          routePostType: selectedRoute.postType,
        }),
      }))
      .filter(shipment => shipment.relevanceScore >= 35)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
    : []

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
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.weight || t('N/A', 'N/A')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Quantity', 'Quantite')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.quantity || t('N/A', 'N/A')}</p>
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
                <p className="text-sm font-semibold text-foreground mt-1">{selectedShipment.dimensions || t('N/A', 'N/A')}</p>
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
                <button
                  onClick={() => contactShipper(selectedShipment, 'community_shipment')}
                  disabled={isInvitationSent?.('community_shipment', selectedShipment.id)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('community_shipment', selectedShipment.id) ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                >
                  {isInvitationSent?.('community_shipment', selectedShipment.id) ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
                </button>
              )}
            </div>
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
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">Departure city</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.from}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">Destination city</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.to}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Departure date', 'Date de depart')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.departure || t('N/A', 'N/A')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Capacity', 'Capacite')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.capacity} {t('tons', 'tonnes')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Available', 'Disponible')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.available} {t('tons', 'tonnes')}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="text-xs text-muted-foreground">{t('Stops', 'Arrets')}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{selectedRoute.postType === 'availability_only' ? t('Not specified', 'Non specifie') : selectedRoute.stops}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedRouteIsMine ? (
                <button
                  onClick={() => deleteRoute(selectedRoute.id)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                >
                  {t('Delete Post', 'Supprimer la publication')}
                </button>
              ) : (
                <button
                  onClick={() => contactShipper(selectedRoute, 'route')}
                  disabled={isInvitationSent?.('route', selectedRoute.id)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('route', selectedRoute.id) ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                >
                  {isInvitationSent?.('route', selectedRoute.id) ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {canViewRelevantSection && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {selectedShipment ? t('Most Relevant Availability Posts', 'Publications de disponibilite les plus pertinentes') : t('Most Relevant Delivery Posts', 'Publications de livraison les plus pertinentes')}
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
                onClick={() => setRelevantRouteFilter('live_truckers')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${relevantRouteFilter === 'live_truckers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/80'}`}
              >
                {t('Live truckers', 'Transporteurs en direct')}
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {selectedShipment && visibleShipmentRelevantRoutes.length > 0 && visibleShipmentRelevantRoutes.map(route => (
            <div key={route.id} className="rounded-xl border border-border bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-base font-bold text-foreground">{route.id}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">{route.relevanceScore}% match</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${route.postType === 'availability_only' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {route.postType === 'availability_only' ? t('Availability only', 'Disponibilite seulement') : t('Full route', 'Trajet complet')}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${route.isLive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {route.isLive ? t('Live', 'En ligne') : t('Offline', 'Hors ligne')}
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
                  <p className="font-semibold text-foreground mt-1">{route.available} {t('tons', 'tonnes')}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Departure date</p>
                  <p className="font-semibold text-foreground mt-1">{route.departure}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Driver', 'Conducteur')}</p>
                  <p className="font-semibold text-foreground mt-1">{route.driverName || t('Unknown driver', 'Conducteur inconnu')}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Last seen', 'Derniere activite')}</p>
                  <p className="font-semibold text-foreground mt-1">{route.lastSeen || t('Offline', 'Hors ligne')}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Current stop', 'Arret actuel')}</p>
                  <p className="font-semibold text-foreground mt-1">{route.currentStop || t('N/A', 'N/A')}</p>
                </div>
              </div>

              <button
                onClick={() => contactShipper(route, 'route')}
                disabled={isInvitationSent?.('route', route.id)}
                className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('route', route.id) ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {isInvitationSent?.('route', route.id) ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
              </button>
            </div>
          ))}

          {selectedRoute && routeRelevantShipments.length > 0 && routeRelevantShipments.map(shipment => (
            <div key={shipment.id} className="rounded-xl border border-border bg-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="text-base font-bold text-foreground">{shipment.id}</p>
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">{shipment.relevanceScore}% match</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Product', 'Produit')}</p>
                  <p className="font-semibold text-foreground mt-1">{shipment.itemName || t('N/A', 'N/A')}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{t('Weight', 'Poids')}</p>
                  <p className="font-semibold text-foreground mt-1">{shipment.weight}</p>
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
                onClick={() => contactShipper(shipment, 'route_relevant_shipment')}
                disabled={isInvitationSent?.('route_relevant_shipment', shipment.id)}
                className={`mt-3 w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isInvitationSent?.('route_relevant_shipment', shipment.id) ? 'bg-green-600 text-white cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              >
                {isInvitationSent?.('route_relevant_shipment', shipment.id) ? t('Invitation Sent', 'Invitation envoyee') : t('Send Invitation', 'Envoyer une invitation')}
              </button>
            </div>
          ))}

          {selectedShipment && visibleShipmentRelevantRoutes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {relevantRouteFilter === 'live_truckers'
                ? t('No relevant live truckers found.', 'Aucun transporteur en direct pertinent trouve.')
                : t('No relevant availability posts found.', 'Aucune publication de disponibilite pertinente trouvee.')}
            </p>
          )}
          {selectedRoute && routeRelevantShipments.length === 0 && <p className="text-sm text-muted-foreground">{t('No relevant delivery posts found.', 'Aucune publication de livraison pertinente trouvee.')}</p>}
        </div>
        </div>
      )}
    </>
  )
}
