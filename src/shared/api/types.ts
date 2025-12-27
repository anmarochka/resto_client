export interface Restaurant {
  id: string
  name: string
  description: string
  cuisine: string
  image: string
  rating: number
  priceRange: string
  address: string
  phone: string
  openingHours: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
    saturday: string
    sunday: string
  }
}

export interface Table {
  id: string
  number: number
  capacity: number
  x: number
  y: number
  positionIndex?: number
  width?: number
  height?: number
  shape?: "rectangle" | "circle"
  status?: "available" | "reserved"
  isAvailable?: boolean
  zone: string // categoryId
  hallId?: string
}

export interface FloorCategory {
  id: string
  title: string
  backgroundColor: string
  order: number
}

export interface FloorPlanState {
  categories: FloorCategory[]
  tables: Table[]
  orderByCategory: Record<string, string[]>
}

export type AnalyticsEventType = "booking_created" | "booking_confirmed" | "booking_cancelled" | "booking_completed"

export interface AnalyticsEvent {
  id: string
  restaurantId: string
  type: AnalyticsEventType
  title: string
  message: string
  createdAt: string
  bookingId?: string
}

export interface AnalyticsSnapshot {
  connected: boolean
  bookingsToday: number
  currentGuestsLoad: number
  peakTime: string
  activeBookings: number
  events: AnalyticsEvent[]
  bookingsByDay: Array<{
    label: string
    bookings: number
    guests: number
  }>
  timeDistribution: Array<{
    time: string
    load: number // 0..1
  }>
  zonePopularity: Array<{
    categoryId: string
    label: string
    percent: number
  }>
  totals: {
    totalBookings: number
    avgGuests: number
    attendancePercent: number
  }
}

export interface Booking {
  id: string
  userId: number
  restaurantId: string
  tableId: string
  date: string
  time: string
  guests: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  createdAt: string
  userName?: string
  userPhone?: string
}

export interface User {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}
