import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsSnapshot,
  Booking,
  FloorCategory,
  FloorPlanState,
  Restaurant,
  Table,
} from "./types"

import italianRestaurantImage from "@/assets/images/restaurants/italian-restaurant-interior.png"
import japaneseRestaurantImage from "@/assets/images/restaurants/japanese-sushi-restaurant.png"
import steakhouseRestaurantImage from "@/assets/images/restaurants/steakhouse-restaurant-dark.jpg"

const STORAGE_PREFIX = "rb_floorplan:"

const zoneLegacyToId: Record<string, string> = {
  "У окна": "window",
  "Основной зал": "main",
  "VIP зона": "vip",
}

const defaultCategories: FloorCategory[] = [
  { id: "window", title: "У окна", backgroundColor: "oklch(0.98 0.005 262)", order: 1 },
  { id: "main", title: "Основной зал", backgroundColor: "oklch(0.95 0.02 262)", order: 2 },
  { id: "vip", title: "VIP зона", backgroundColor: "oklch(0.96 0.005 262)", order: 3 },
]

const liveEventsByRestaurant: Record<string, AnalyticsEvent[]> = {}

function getStorageKey(restaurantId: string) {
  return `${STORAGE_PREFIX}${restaurantId}`
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function computeOrderByCategory(tables: Table[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  const groups = new Map<string, Table[]>()
  for (const table of tables) {
    const zoneId = zoneLegacyToId[table.zone] ?? table.zone
    groups.set(zoneId, [...(groups.get(zoneId) ?? []), { ...table, zone: zoneId }])
  }

  for (const [zoneId, zoneTables] of groups.entries()) {
    map[zoneId] = zoneTables.sort((a, b) => a.number - b.number).map((t) => t.id)
  }
  return map
}

function normalizeState(state: FloorPlanState): FloorPlanState {
  const categories = state.categories.length ? state.categories : [...defaultCategories]
  const tables = state.tables.map((t) => ({ ...t, zone: zoneLegacyToId[t.zone] ?? t.zone }))
  const orderByCategory = state.orderByCategory ?? computeOrderByCategory(tables)

  const knownCategoryIds = new Set(categories.map((c) => c.id))
  const fallbackCategoryId = categories.sort((a, b) => a.order - b.order)[0]?.id ?? "main"

  const normalizedTables = tables.map((t) => (knownCategoryIds.has(t.zone) ? t : { ...t, zone: fallbackCategoryId }))

  // Ensure every table exists in order list
  const nextOrder: Record<string, string[]> = { ...orderByCategory }
  for (const categoryId of knownCategoryIds) {
    nextOrder[categoryId] = [...(nextOrder[categoryId] ?? [])]
  }
  for (const table of normalizedTables) {
    const list = nextOrder[table.zone] ?? []
    if (!list.includes(table.id)) list.push(table.id)
    nextOrder[table.zone] = list
  }

  // Remove ids that no longer exist
  const tableIdSet = new Set(normalizedTables.map((t) => t.id))
  for (const categoryId of Object.keys(nextOrder)) {
    nextOrder[categoryId] = nextOrder[categoryId].filter((id) => tableIdSet.has(id))
  }

  return { categories, tables: normalizedTables, orderByCategory: nextOrder }
}

function getDefaultState(restaurantId: string): FloorPlanState {
  const tables = (mockFloorPlans[restaurantId] ?? []).map((t) => ({ ...t, zone: zoneLegacyToId[t.zone] ?? t.zone }))
  return normalizeState({
    categories: [...defaultCategories],
    tables,
    orderByCategory: computeOrderByCategory(tables),
  })
}

function loadFloorPlanState(restaurantId: string): FloorPlanState {
  if (typeof window === "undefined") return getDefaultState(restaurantId)
  const raw = window.localStorage.getItem(getStorageKey(restaurantId))
  if (!raw) return getDefaultState(restaurantId)
  const parsed = safeParseJson<FloorPlanState>(raw)
  if (!parsed) return getDefaultState(restaurantId)
  return normalizeState(parsed)
}

function saveFloorPlanState(restaurantId: string, state: FloorPlanState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(getStorageKey(restaurantId), JSON.stringify(normalizeState(state)))
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function pushLiveEvent(restaurantId: string, event: Omit<AnalyticsEvent, "id" | "restaurantId" | "createdAt">) {
  const next: AnalyticsEvent = {
    id: genId("evt"),
    restaurantId,
    createdAt: new Date().toISOString(),
    ...event,
  }
  const list = liveEventsByRestaurant[restaurantId] ?? []
  liveEventsByRestaurant[restaurantId] = [next, ...list].slice(0, 50)
}

function seedLiveEvent(
  restaurantId: string,
  minutesAgo: number,
  event: Omit<AnalyticsEvent, "id" | "restaurantId" | "createdAt">,
) {
  const createdAt = new Date(Date.now() - minutesAgo * 60000).toISOString()
  const next: AnalyticsEvent = { id: genId("evt"), restaurantId, createdAt, ...event }
  const list = liveEventsByRestaurant[restaurantId] ?? []
  liveEventsByRestaurant[restaurantId] = [...list, next].slice(-50).reverse()
}

function bookingEventTitle(type: AnalyticsEventType) {
  if (type === "booking_created") return "Новое бронирование"
  if (type === "booking_confirmed") return "Подтверждено"
  if (type === "booking_cancelled") return "Отменено"
  return "Завершено"
}

function formatBookingMessage(booking: Booking, tableNumber?: number) {
  const restaurantName = mockRestaurants.find((r) => r.id === booking.restaurantId)?.name ?? "Ресторан"
  const table = tableNumber ? `Стол ${tableNumber}` : `Стол ${booking.tableId}`
  const guests = booking.guests === 1 ? "1 гость" : `${booking.guests} гостей`
  return `${restaurantName} • ${booking.time} • ${guests} • ${table}`
}

function dayLabelRU(date: Date) {
  const map = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
  return map[date.getDay()] ?? ""
}

function toISODate(d: Date) {
  return d.toISOString().split("T")[0]
}

function safePercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function computeAnalyticsSnapshot(restaurantId: string): AnalyticsSnapshot {
  const now = new Date()
  const todayIso = toISODate(now)
  const restaurantBookings = mockBookingsData.filter((b) => b.restaurantId === restaurantId)

  const bookingsToday = restaurantBookings.filter((b) => b.date === todayIso).length

  const activeBookings = restaurantBookings.filter((b) => b.status === "confirmed" || b.status === "pending").length

  // Approx current load: confirmed bookings today within +-2h window
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const currentGuestsLoad = restaurantBookings
    .filter((b) => b.status === "confirmed" && b.date === todayIso)
    .filter((b) => {
      const [h, m] = b.time.split(":").map(Number)
      const minutes = (h || 0) * 60 + (m || 0)
      return Math.abs(minutes - nowMinutes) <= 120
    })
    .reduce((sum, b) => sum + b.guests, 0)

  // Peak time over last 7 days by guests
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    return d
  })
  const last7Set = new Set(last7.map(toISODate))
  const guestsByTime = new Map<string, number>()
  for (const b of restaurantBookings) {
    if (!last7Set.has(b.date)) continue
    guestsByTime.set(b.time, (guestsByTime.get(b.time) ?? 0) + b.guests)
  }
  const peakTime =
    Array.from(guestsByTime.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    (restaurantBookings[0]?.time ?? "19:00")

  // Bookings by day (last 7 days)
  const bookingsByDay = last7.map((d) => {
    const iso = toISODate(d)
    const items = restaurantBookings.filter((b) => b.date === iso)
    return {
      label: dayLabelRU(d),
      bookings: items.length,
      guests: items.reduce((s, b) => s + b.guests, 0),
    }
  })

  // Time distribution points (sampled)
  const timeDistribution = ["18:30", "19:00", "20:00"].map((t) => {
    const guestsAtTime = restaurantBookings
      .filter((b) => b.status === "confirmed" && b.time === t)
      .reduce((s, b) => s + b.guests, 0)
    const load = Math.max(0, Math.min(1, guestsAtTime / 20))
    return { time: t, load }
  })

  // Zone popularity from bookings (confirmed+pending)
  const state = loadFloorPlanState(restaurantId)
  const tableById = Object.fromEntries(state.tables.map((t) => [t.id, t]))
  const countsByZone = new Map<string, number>()
  const relevant = restaurantBookings.filter((b) => b.status !== "cancelled")
  for (const b of relevant) {
    const zoneId = tableById[b.tableId]?.zone ?? "main"
    countsByZone.set(zoneId, (countsByZone.get(zoneId) ?? 0) + 1)
  }
  const totalZone = Array.from(countsByZone.values()).reduce((s, n) => s + n, 0) || 1

  const zonePopularity = state.categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const count = countsByZone.get(c.id) ?? 0
      const percent = safePercent((count / totalZone) * 100)
      return { categoryId: c.id, label: c.title, percent }
    })

  const totalBookings = restaurantBookings.length
  const avgGuests = totalBookings ? restaurantBookings.reduce((s, b) => s + b.guests, 0) / totalBookings : 0
  const cancelRatePercent = safePercent(
    totalBookings ? (restaurantBookings.filter((b) => b.status === "cancelled").length / totalBookings) * 100 : 0,
  )
  const attendancePercent = safePercent(100 - cancelRatePercent)

  const events = (liveEventsByRestaurant[restaurantId] ?? []).slice(0, 8)

  return {
    connected: true,
    bookingsToday,
    currentGuestsLoad,
    peakTime,
    activeBookings,
    events,
    bookingsByDay,
    timeDistribution,
    zonePopularity,
    totals: { totalBookings, avgGuests: Number(avgGuests.toFixed(1)), attendancePercent: Math.round(attendancePercent) },
  }
}

// Mock Restaurants
export const mockRestaurants: Restaurant[] = [
  {
    id: "r1",
    name: "La Bella Vista",
    description: "Изысканная итальянская кухня с панорамным видом на город",
    cuisine: "Итальянская",
    image: italianRestaurantImage,
    rating: 4.8,
    priceRange: "€€€",
    address: "ул. Ленина, 123",
    phone: "+375 29 123-45-67",
    openingHours: {
      monday: "12:00-23:00",
      tuesday: "12:00-23:00",
      wednesday: "12:00-23:00",
      thursday: "12:00-23:00",
      friday: "12:00-00:00",
      saturday: "12:00-00:00",
      sunday: "12:00-22:00",
    },
  },
  {
    id: "r2",
    name: "Суши Мастер",
    description: "Аутентичная японская кухня от шеф-повара из Токио",
    cuisine: "Японская",
    image: japaneseRestaurantImage,
    rating: 4.9,
    priceRange: "€€€€",
    address: "пр. Независимости, 45",
    phone: "+375 29 987-65-43",
    openingHours: {
      monday: "11:00-23:00",
      tuesday: "11:00-23:00",
      wednesday: "11:00-23:00",
      thursday: "11:00-23:00",
      friday: "11:00-01:00",
      saturday: "11:00-01:00",
      sunday: "11:00-23:00",
    },
  },
  {
    id: "r3",
    name: "Steak House Premium",
    description: "Лучшие стейки из мраморной говядины",
    cuisine: "Американская",
    image: steakhouseRestaurantImage,
    rating: 4.7,
    priceRange: "€€€€",
    address: "ул. Победителей, 78",
    phone: "+375 29 555-44-33",
    openingHours: {
      monday: "13:00-23:00",
      tuesday: "13:00-23:00",
      wednesday: "13:00-23:00",
      thursday: "13:00-23:00",
      friday: "13:00-01:00",
      saturday: "13:00-01:00",
      sunday: "13:00-22:00",
    },
  },
]

// Mock Floor Plans
export const mockFloorPlans: Record<string, Table[]> = {
  r1: [
    { id: "t1", number: 1, capacity: 2, x: 30, y: 30, status: "available", zone: "window" },
    { id: "t2", number: 2, capacity: 2, x: 150, y: 30, status: "available", zone: "window" },
    { id: "t3", number: 3, capacity: 4, x: 270, y: 30, status: "occupied", zone: "window" },
    { id: "t4", number: 4, capacity: 4, x: 30, y: 130, status: "available", zone: "main" },
    { id: "t5", number: 5, capacity: 2, x: 150, y: 130, status: "available", zone: "main" },
    { id: "t6", number: 6, capacity: 6, x: 270, y: 130, status: "available", zone: "main" },
    { id: "t7", number: 7, capacity: 4, x: 30, y: 245, status: "available", zone: "vip" },
    { id: "t8", number: 8, capacity: 2, x: 150, y: 245, status: "available", zone: "vip" },
    { id: "t9", number: 9, capacity: 6, x: 270, y: 245, status: "available", zone: "vip" },
  ],
  r2: [
    { id: "t1", number: 1, capacity: 2, x: 30, y: 30, status: "available", zone: "window" },
    { id: "t2", number: 2, capacity: 2, x: 150, y: 30, status: "available", zone: "window" },
    { id: "t3", number: 3, capacity: 4, x: 270, y: 30, status: "available", zone: "window" },
    { id: "t4", number: 4, capacity: 4, x: 30, y: 130, status: "available", zone: "main" },
    { id: "t5", number: 5, capacity: 2, x: 150, y: 130, status: "occupied", zone: "main" },
    { id: "t6", number: 6, capacity: 6, x: 270, y: 130, status: "available", zone: "main" },
    { id: "t7", number: 7, capacity: 4, x: 30, y: 245, status: "available", zone: "vip" },
    { id: "t8", number: 8, capacity: 2, x: 150, y: 245, status: "available", zone: "vip" },
    { id: "t9", number: 9, capacity: 6, x: 270, y: 245, status: "available", zone: "vip" },
  ],
  r3: [
    { id: "t1", number: 1, capacity: 2, x: 30, y: 30, status: "available", zone: "window" },
    { id: "t2", number: 2, capacity: 2, x: 150, y: 30, status: "available", zone: "window" },
    { id: "t3", number: 3, capacity: 4, x: 270, y: 30, status: "available", zone: "window" },
    { id: "t4", number: 4, capacity: 4, x: 30, y: 130, status: "available", zone: "main" },
    { id: "t5", number: 5, capacity: 2, x: 150, y: 130, status: "available", zone: "main" },
    { id: "t6", number: 6, capacity: 6, x: 270, y: 130, status: "available", zone: "main" },
    { id: "t7", number: 7, capacity: 4, x: 30, y: 245, status: "available", zone: "vip" },
    { id: "t8", number: 8, capacity: 2, x: 150, y: 245, status: "occupied", zone: "vip" },
    { id: "t9", number: 9, capacity: 6, x: 270, y: 245, status: "available", zone: "vip" },
  ],
}

// Mock Bookings
const mockBookingsData: Booking[] = [
  {
    id: "b1",
    userId: 123456789,
    restaurantId: "r1",
    tableId: "t3",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "19:00",
    guests: 4,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    userName: "Иван Петров",
    userPhone: "+375 29 123-45-67",
  },
  {
    id: "b2",
    userId: 123456789,
    restaurantId: "r1",
    tableId: "t5",
    date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
    time: "19:00",
    guests: 2,
    status: "pending",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    userName: "Иван Петров",
    userPhone: "+375 29 123-45-67",
  },
  {
    id: "b3",
    userId: 123456789,
    restaurantId: "r1",
    tableId: "t9",
    date: new Date(Date.now() + 259200000).toISOString().split("T")[0],
    time: "20:30",
    guests: 6,
    status: "cancelled",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    userName: "Иван Петров",
    userPhone: "+375 29 123-45-67",
  },
]

let bookingCounter = 3

// Seed initial live events for demo
if (!liveEventsByRestaurant.r1) {
  const r1Bookings = mockBookingsData.filter((b) => b.restaurantId === "r1")
  const b1 = r1Bookings[0]
  const b2 = r1Bookings[1]
  const b3 = r1Bookings[2]
  if (b1) {
    seedLiveEvent("r1", 2, {
      type: "booking_created",
      title: bookingEventTitle("booking_created"),
      message: formatBookingMessage(b1, loadFloorPlanState("r1").tables.find((t) => t.id === b1.tableId)?.number),
      bookingId: b1.id,
    })
    seedLiveEvent("r1", 5, {
      type: "booking_confirmed",
      title: bookingEventTitle("booking_confirmed"),
      message: formatBookingMessage(b1, loadFloorPlanState("r1").tables.find((t) => t.id === b1.tableId)?.number),
      bookingId: b1.id,
    })
  }
  if (b2) {
    seedLiveEvent("r1", 8, {
      type: "booking_created",
      title: bookingEventTitle("booking_created"),
      message: formatBookingMessage(b2, loadFloorPlanState("r1").tables.find((t) => t.id === b2.tableId)?.number),
      bookingId: b2.id,
    })
  }
  if (b3) {
    seedLiveEvent("r1", 12, {
      type: "booking_cancelled",
      title: bookingEventTitle("booking_cancelled"),
      message: formatBookingMessage(b3, loadFloorPlanState("r1").tables.find((t) => t.id === b3.tableId)?.number),
      bookingId: b3.id,
    })
  }
}

// Mock Data Service
export const mockDataService = {
  getRestaurants: async (): Promise<Restaurant[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockRestaurants
  },

  getRestaurant: async (id: string): Promise<Restaurant | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockRestaurants.find((r) => r.id === id) || null
  },

  getFloorPlan: async (restaurantId: string): Promise<Table[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return loadFloorPlanState(restaurantId).tables
  },

  updateTableStatus: async (restaurantId: string, tableId: string, status: Table["status"]): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const state = loadFloorPlanState(restaurantId)
    const idx = state.tables.findIndex((t) => t.id === tableId)
    if (idx === -1) return
    state.tables[idx] = { ...state.tables[idx], status }
    saveFloorPlanState(restaurantId, state)
  },

  getBookings: async (userId?: number): Promise<Booking[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (userId) {
      return mockBookingsData.filter((b) => b.userId === userId)
    }
    return mockBookingsData
  },

  createBooking: async (data: Omit<Booking, "id" | "createdAt">): Promise<Booking> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const booking: Booking = {
      ...data,
      id: `b${bookingCounter++}`,
      createdAt: new Date().toISOString(),
    }

    mockBookingsData.push(booking)
    await mockDataService.updateTableStatus(data.restaurantId, data.tableId, "reserved")
    pushLiveEvent(data.restaurantId, {
      type: "booking_created",
      title: bookingEventTitle("booking_created"),
      message: formatBookingMessage(booking, loadFloorPlanState(data.restaurantId).tables.find((t) => t.id === data.tableId)?.number),
      bookingId: booking.id,
    })
    if (booking.status === "confirmed") {
      pushLiveEvent(data.restaurantId, {
        type: "booking_confirmed",
        title: bookingEventTitle("booking_confirmed"),
        message: formatBookingMessage(booking, loadFloorPlanState(data.restaurantId).tables.find((t) => t.id === data.tableId)?.number),
        bookingId: booking.id,
      })
    }

    return booking
  },

  cancelBooking: async (id: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const booking = mockBookingsData.find((b) => b.id === id)
    if (booking) {
      booking.status = "cancelled"
      await mockDataService.updateTableStatus(booking.restaurantId, booking.tableId, "available")
      pushLiveEvent(booking.restaurantId, {
        type: "booking_cancelled",
        title: bookingEventTitle("booking_cancelled"),
        message: formatBookingMessage(booking, loadFloorPlanState(booking.restaurantId).tables.find((t) => t.id === booking.tableId)?.number),
        bookingId: booking.id,
      })
      return true
    }
    return false
  },

  updateBookingStatus: async (id: string, status: Booking["status"]): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const booking = mockBookingsData.find((b) => b.id === id)
    if (!booking) return false

    booking.status = status

    if (status === "cancelled" || status === "completed") {
      await mockDataService.updateTableStatus(booking.restaurantId, booking.tableId, "available")
    }
    if (status === "confirmed") {
      await mockDataService.updateTableStatus(booking.restaurantId, booking.tableId, "reserved")
    }

    const type: AnalyticsEventType =
      status === "confirmed"
        ? "booking_confirmed"
        : status === "cancelled"
          ? "booking_cancelled"
          : status === "completed"
            ? "booking_completed"
            : "booking_created"

    pushLiveEvent(booking.restaurantId, {
      type,
      title: bookingEventTitle(type),
      message: formatBookingMessage(booking, loadFloorPlanState(booking.restaurantId).tables.find((t) => t.id === booking.tableId)?.number),
      bookingId: booking.id,
    })

    return true
  },

  getFloorPlanState: async (restaurantId: string): Promise<FloorPlanState> => {
    await new Promise((resolve) => setTimeout(resolve, 150))
    return loadFloorPlanState(restaurantId)
  },

  saveFloorPlanState: async (restaurantId: string, state: FloorPlanState): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150))
    saveFloorPlanState(restaurantId, state)
  },

  getFloorCategories: async (restaurantId: string): Promise<FloorCategory[]> => {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const state = loadFloorPlanState(restaurantId)
    return state.categories.slice().sort((a, b) => a.order - b.order)
  },

  getAnalyticsSnapshot: async (restaurantId: string): Promise<AnalyticsSnapshot> => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    return computeAnalyticsSnapshot(restaurantId)
  },
}
