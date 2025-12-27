import { apiGet, apiPatch, apiPost, apiDelete } from "./apiClient"
import type { AnalyticsSnapshot, Booking, FloorCategory, FloorPlanState, Restaurant, Table } from "./types"

type ApiRestaurant = {
  id: string
  name: string
  address: string
  rating_value?: number | string
  rating_count?: number
  work_time_from?: string
  work_time_to?: string
  image_url?: string
  cuisines?: { id: string; name: string } | null
}

type ApiHall = {
  id: string
  name: string
  color_code: string
  sort_order: number
  tables?: Array<{ id: string }>
}

type ApiTable = {
  id: string
  hallId: string
  hallName: string | null
  tableNumber: number
  seats: number
  positionIndex: number
  status: "available" | "occupied"
}

type ApiReservation = {
  id: string
  restaurant_id: string
  hall_id: string
  table_id: string
  user_id: string | null
  date: string
  time_from: string
  time_to: string
  guests_count: number
  status: "pending" | "confirmed" | "cancelled" | "completed"
  created_at: string
  guest_name: string | null
  guest_phone: string | null
}

const DEFAULT_OPENING_HOURS = "12:00-23:00"

function toHHMM(raw?: string) {
  if (!raw) return ""
  if (raw.includes("T")) return raw.slice(11, 16)
  if (raw.length >= 5) return raw.slice(0, 5)
  return raw
}

function toISODate(raw: string) {
  if (raw.includes("T")) return raw.slice(0, 10)
  return raw
}

function mapRestaurant(r: ApiRestaurant): Restaurant {
  const from = toHHMM(r.work_time_from)
  const to = toHHMM(r.work_time_to)
  const timeRange = from && to ? `${from}-${to}` : DEFAULT_OPENING_HOURS
  return {
    id: r.id,
    name: r.name,
    description: "",
    cuisine: r.cuisines?.name ?? "",
    image: r.image_url ?? "",
    rating: Number(r.rating_value ?? 0),
    priceRange: "",
    address: r.address,
    phone: "",
    openingHours: {
      monday: timeRange,
      tuesday: timeRange,
      wednesday: timeRange,
      thursday: timeRange,
      friday: timeRange,
      saturday: timeRange,
      sunday: timeRange,
    },
  }
}

function mapTable(t: ApiTable): Table {
  return {
    id: t.id,
    number: t.tableNumber,
    capacity: t.seats,
    x: 0,
    y: 0,
    shape: "circle",
    status: t.status === "occupied" ? "reserved" : "available",
    zone: t.hallId,
    hallId: t.hallId,
    positionIndex: t.positionIndex,
  }
}

function mapReservation(r: ApiReservation): Booking {
  return {
    id: r.id,
    userId: 0,
    restaurantId: r.restaurant_id,
    tableId: r.table_id,
    date: toISODate(r.date),
    time: toHHMM(r.time_from),
    guests: r.guests_count,
    status: r.status,
    createdAt: r.created_at,
    userName: r.guest_name ?? undefined,
    userPhone: r.guest_phone ?? undefined,
  }
}

function addHours(hhmm: string, hours: number) {
  const [h, m] = hhmm.split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const total = h * 60 + m + hours * 60
  if (total >= 24 * 60) return "23:59"
  const nextH = Math.floor(total / 60)
  const nextM = total % 60
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`
}

export const dataService = {
  async getRestaurants(): Promise<Restaurant[]> {
    const data = await apiGet<ApiRestaurant[]>("/api/restaurants")
    return data.map(mapRestaurant)
  },

  async getRestaurant(id: string): Promise<Restaurant | null> {
    const data = await apiGet<ApiRestaurant>(`/api/restaurants/${id}`)
    return data ? mapRestaurant(data) : null
  },

  async getFloorCategories(restaurantId: string): Promise<FloorCategory[]> {
    const halls = await apiGet<ApiHall[]>(`/api/restaurants/${restaurantId}/floor-plan`)
    return halls.map((h) => ({
      id: h.id,
      title: h.name,
      backgroundColor: h.color_code,
      order: h.sort_order ?? 0,
    }))
  },

  async getFloorPlan(restaurantId: string): Promise<Table[]> {
    const tables = await apiGet<ApiTable[]>(`/api/restaurants/${restaurantId}/tables`)
    return tables.map(mapTable)
  },

  async getFloorPlanState(restaurantId: string): Promise<FloorPlanState> {
    const [categories, tables] = await Promise.all([
      dataService.getFloorCategories(restaurantId),
      dataService.getFloorPlan(restaurantId),
    ])

    const orderByCategory: Record<string, string[]> = {}
    const tablesByZone = new Map<string, Table[]>()
    for (const t of tables) {
      const list = tablesByZone.get(t.zone) ?? []
      list.push(t)
      tablesByZone.set(t.zone, list)
    }

    for (const [zoneId, list] of tablesByZone.entries()) {
      orderByCategory[zoneId] = list
        .slice()
        .sort((a, b) => (a.positionIndex ?? 0) - (b.positionIndex ?? 0) || a.number - b.number)
        .map((t) => t.id)
    }

    for (const category of categories) {
      if (!orderByCategory[category.id]) orderByCategory[category.id] = []
    }

    return { categories, tables, orderByCategory }
  },

  async saveFloorPlanState(restaurantId: string, state: FloorPlanState): Promise<void> {
    const categoriesSorted = state.categories.slice().sort((a, b) => a.order - b.order)
    await Promise.all(
      categoriesSorted.map((c) =>
        apiPatch(`/api/admin/restaurants/${restaurantId}/zones/${c.id}`, {
          name: c.title,
          colorCode: c.backgroundColor,
          sortOrder: c.order,
        }),
      ),
    )

    if (categoriesSorted.length) {
      await apiPatch(`/api/admin/restaurants/${restaurantId}/zones/reorder`, {
        zoneIds: categoriesSorted.map((c) => c.id),
      })
    }

    const tableUpdates = state.tables.map((t) =>
      apiPatch(`/api/admin/restaurants/${restaurantId}/tables/${t.id}`, {
        hallId: t.zone,
        tableNumber: t.number,
        seats: t.capacity,
      }),
    )
    await Promise.all(tableUpdates)

    const tablesByZone = new Map<string, string[]>()
    for (const [zoneId, ids] of Object.entries(state.orderByCategory)) {
      tablesByZone.set(zoneId, ids)
    }

    const reorderCalls = Array.from(tablesByZone.entries()).map(([hallId, tableIds]) =>
      apiPatch(`/api/admin/restaurants/${restaurantId}/tables/reorder`, {
        hallId,
        tableIds,
      }),
    )
    await Promise.all(reorderCalls)

    // Status updates are handled explicitly when changed in the editor.
  },

  async createFloorCategory(restaurantId: string, payload: { title: string; backgroundColor: string }) {
    const data = await apiPost<ApiHall>(`/api/admin/restaurants/${restaurantId}/zones`, {
      name: payload.title,
      colorCode: payload.backgroundColor,
      sortOrder: 0,
    })
    return {
      id: data.id,
      title: data.name,
      backgroundColor: data.color_code,
      order: data.sort_order ?? 0,
    } as FloorCategory
  },

  async deleteFloorCategory(restaurantId: string, categoryId: string) {
    await apiDelete(`/api/admin/restaurants/${restaurantId}/zones/${categoryId}`)
  },

  async reorderFloorCategories(restaurantId: string, ids: string[]) {
    await apiPatch(`/api/admin/restaurants/${restaurantId}/zones/reorder`, { zoneIds: ids })
  },

  async createTable(
    restaurantId: string,
    payload: { hallId: string; tableNumber: number; seats: number },
  ) {
    const data = await apiPost<any>(`/api/admin/restaurants/${restaurantId}/tables`, {
      hallId: payload.hallId,
      tableNumber: payload.tableNumber,
      seats: payload.seats,
    })
    return {
      id: data.id,
      number: data.table_number,
      capacity: data.seats,
      x: 0,
      y: 0,
      shape: "circle",
      status: "available",
      zone: data.hall_id,
      hallId: data.hall_id,
      positionIndex: data.position_index,
    } as Table
  },

  async deleteTable(restaurantId: string, tableId: string) {
    await apiDelete(`/api/admin/restaurants/${restaurantId}/tables/${tableId}`)
  },

  async updateTableStatus(restaurantId: string, tableId: string, status: Table["status"]) {
    await apiPatch(`/api/restaurants/${restaurantId}/tables/${tableId}/status`, {
      status: status === "reserved" ? "occupied" : "available",
    })
  },

  async getBookings(_userId?: number): Promise<Booking[]> {
    const data = await apiGet<ApiReservation[]>("/api/bookings")
    return data.map(mapReservation)
  },

  async createBooking(payload: {
    restaurantId: string
    hallId: string
    tableId: string
    date: string
    time: string
    guests: number
    userName?: string
    userPhone?: string
  }): Promise<Booking> {
    const timeTo = addHours(payload.time, 2)
    const res = await apiPost<ApiReservation>("/api/bookings", {
      restaurantId: payload.restaurantId,
      hallId: payload.hallId,
      tableId: payload.tableId,
      date: payload.date,
      timeFrom: payload.time,
      timeTo,
      guestsCount: payload.guests,
      guestName: payload.userName,
      guestPhone: payload.userPhone,
    })
    return mapReservation(res)
  },

  async cancelBooking(id: string): Promise<boolean> {
    await apiPatch(`/api/bookings/${id}/cancel`, { reason: "Отмена пользователем" })
    return true
  },

  async getAdminBookings(params?: { status?: string; search?: string }): Promise<Booking[]> {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.search) q.set("search", params.search)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    const data = await apiGet<ApiReservation[]>(`/api/admin/bookings${suffix}`)
    return data.map(mapReservation)
  },

  async createAdminBooking(payload: {
    hallId: string
    tableId: string
    date: string
    time: string
    guests: number
    userName: string
    userPhone: string
  }) {
    const timeTo = addHours(payload.time, 2)
    const res = await apiPost<ApiReservation>("/api/admin/bookings", {
      hallId: payload.hallId,
      tableId: payload.tableId,
      date: payload.date,
      timeFrom: payload.time,
      timeTo,
      guestsCount: payload.guests,
      guestName: payload.userName,
      guestPhone: payload.userPhone,
    })
    return mapReservation(res)
  },

  async updateAdminBookingStatus(id: string, status: Booking["status"]) {
    await apiPatch(`/api/admin/bookings/${id}/status`, { status })
  },

  async getAnalyticsSnapshot(restaurantId: string): Promise<AnalyticsSnapshot> {
    return apiGet<AnalyticsSnapshot>(`/api/admin/analytics/${restaurantId}`)
  },
}
