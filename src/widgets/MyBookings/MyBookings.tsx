import { useEffect, useMemo, useState } from "react"
import { Card } from "@shared/ui/Card"
import { Button } from "@shared/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/ui/Dialog"
import { dataService } from "@shared/api/dataService"
import type { Booking, Restaurant, Table } from "@shared/api/types"
import styles from "./MyBookings.module.scss"

interface MyBookingsProps {
  userId?: number
}

export function MyBookings({ userId }: MyBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [tablesByRestaurant, setTablesByRestaurant] = useState<Record<string, Table[]>>({})
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming")
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [restaurantsData, bookingsData] = await Promise.all([
          dataService.getRestaurants(),
          dataService.getBookings(userId),
        ])
        setRestaurants(restaurantsData)
        setBookings(bookingsData)

        const restaurantIds = Array.from(new Set(bookingsData.map((b) => b.restaurantId)))
        const floorPlans = await Promise.all(restaurantIds.map(async (id) => [id, await dataService.getFloorPlan(id)] as const))
        setTablesByRestaurant(Object.fromEntries(floorPlans))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [userId])

  const openCancelDialog = (bookingId: string) => {
    setPendingCancelId(bookingId)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!pendingCancelId) return
    setCancelSubmitting(true)
    try {
      setBookings((prev) => prev.map((b) => (b.id === pendingCancelId ? { ...b, status: "cancelled" } : b)))
      await dataService.cancelBooking(pendingCancelId)
      setCancelDialogOpen(false)
      setPendingCancelId(null)
    } finally {
      setCancelSubmitting(false)
    }
  }

  const restaurantsById = useMemo(() => Object.fromEntries(restaurants.map((r) => [r.id, r])), [restaurants])

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.date)
      const now = new Date()

      if (filter === "upcoming") return bookingDate >= now && booking.status !== "cancelled"
      if (filter === "past") return bookingDate < now || booking.status === "cancelled"
      return true
    })
  }, [bookings, filter])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className={styles.myBookings}>
      <h1 className={styles.title}>Мои бронирования</h1>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
          onClick={() => setFilter("all")}
        >
          Все
        </button>
        <button
          className={`${styles.filterButton} ${filter === "upcoming" ? styles.active : ""}`}
          onClick={() => setFilter("upcoming")}
        >
          Предстоящие
        </button>
        <button
          className={`${styles.filterButton} ${filter === "past" ? styles.active : ""}`}
          onClick={() => setFilter("past")}
        >
          Прошедшие
        </button>
      </div>

      <div className={styles.bookingsList}>
        {loading ? (
          <Card className={styles.emptyState}>
            <p>Загрузка...</p>
          </Card>
        ) : filteredBookings.length === 0 ? (
          <Card className={styles.emptyState}>
            <p>У вас пока нет бронирований</p>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            (() => {
              const restaurant = restaurantsById[booking.restaurantId]
              const tables = tablesByRestaurant[booking.restaurantId] ?? []
              const table = tables.find((t) => t.id === booking.tableId)
              const restaurantName = restaurant?.name ?? booking.restaurantId
              const tableLabel = table ? `№${table.number}` : booking.tableId

              return (
            <Card key={booking.id} className={styles.bookingCard}>
              <div className={styles.bookingHeader}>
                <h3 className={styles.restaurantName}>{restaurantName}</h3>
                <span className={`${styles.status} ${styles[booking.status]}`}>
                  {booking.status === "confirmed" && "Подтверждено"}
                  {booking.status === "pending" && "Ожидание"}
                  {booking.status === "cancelled" && "Отменено"}
                </span>
              </div>

              <div className={styles.bookingDetails}>
                <div className={styles.detail}>
                  <span className={styles.label}>Дата:</span>
                  <span className={styles.value}>{formatDate(booking.date)}</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Время:</span>
                  <span className={styles.value}>{booking.time}</span>
                </div>
                <div className={styles.detail}>
                  <span className={styles.label}>Столик:</span>
                  <span className={styles.value}>
                    {tableLabel} ({booking.guests} гостей)
                  </span>
                </div>
              </div>

              {booking.status === "confirmed" && (
                <div className={styles.actions}>
                  <Button variant="outline" onClick={() => openCancelDialog(booking.id)}>
                    Отменить бронирование
                  </Button>
                </div>
              )}
            </Card>
              )
            })()
          ))
        )}
      </div>

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (cancelSubmitting) return
          setCancelDialogOpen(open)
          if (!open) setPendingCancelId(null)
        }}
      >
        <DialogContent className={styles.cancelDialog}>
          <DialogHeader>
            <DialogTitle>Отменить бронирование?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отменить это бронирование?
              <br />
              Администратор получит уведомление об отмене.
            </DialogDescription>
          </DialogHeader>

          <div className={styles.cancelActions}>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false)
                setPendingCancelId(null)
              }}
              disabled={cancelSubmitting}
            >
              Назад
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={cancelSubmitting || !pendingCancelId}>
              Отменить бронь
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
