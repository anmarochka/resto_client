import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/ui/Dialog"
import { Input } from "@shared/ui/Input"
import { Label } from "@shared/ui/Label"
import { Select } from "@shared/ui/Select"
import { mockDataService } from "@shared/api/mockData"
import type { Booking, Table } from "@shared/api/types"
import { Ban, Calendar, Clock, Phone, Plus, Search, User, Users, X } from "lucide-react"
import type { AdminOutletContext } from "../AdminLayout"
import styles from "../AdminPage.module.scss"
import { toast } from "@shared/lib/hooks"

function formatGuests(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} человек`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} человека`
  return `${n} человек`
}

function validatePhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "")
  return normalized.length >= 7
}

export function AdminBookingsPage() {
  const { restaurant } = useOutletContext<AdminOutletContext>()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

  const [statusFilter, setStatusFilter] = useState<"all" | Booking["status"]>("all")
  const [query, setQuery] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    userName: "Иван Иванов",
    userPhone: "+375 29 123-45-67",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "19:00",
    guests: 2,
    tableId: "",
  })

  const loadBookings = useCallback(async () => {
    const data = await mockDataService.getBookings()
    setBookings(data.filter((b) => b.restaurantId === restaurant.id))
  }, [restaurant.id])

  const loadTables = useCallback(async () => {
    const data = await mockDataService.getFloorPlan(restaurant.id)
    setTables(data)
    setCreateForm((prev) => {
      if (prev.tableId) return prev
      const firstAvailable = data.find((t) => (t.status ?? "available") === "available")
      if (!firstAvailable) return prev
      return { ...prev, tableId: firstAvailable.id }
    })
  }, [restaurant.id])

  useEffect(() => {
    void loadBookings()
    void loadTables()
  }, [loadBookings, loadTables])

  const stats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }),
    [bookings],
  )

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bookings
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((b) => (statusFilter === "all" ? true : b.status === statusFilter))
      .filter((b) => {
        if (!q) return true
        const tableNumber = tables.find((t) => t.id === b.tableId)?.number
        return (
          (b.userName ?? "").toLowerCase().includes(q) ||
          (b.userPhone ?? "").toLowerCase().includes(q) ||
          (b.time ?? "").toLowerCase().includes(q) ||
          b.date.toLowerCase().includes(q) ||
          `${tableNumber ?? ""}`.includes(q) ||
          b.tableId.toLowerCase().includes(q)
        )
      })
  }, [bookings, query, statusFilter, tables])

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  }

  const statusLabel = (s: Booking["status"]) => {
    if (s === "pending") return "Не подтверждено"
    if (s === "confirmed") return "Подтверждено"
    if (s === "cancelled") return "Отменено"
    return "Завершено"
  }

  const openCreate = async () => {
    setCreateError(null)
    setCreateOpen(true)
    await loadTables()
  }

  const canCreate =
    createForm.userName.trim().length > 1 &&
    validatePhone(createForm.userPhone) &&
    Boolean(createForm.date) &&
    Boolean(createForm.time) &&
    Number(createForm.guests) >= 1 &&
    Boolean(createForm.tableId)

  const handleCreate = async () => {
    if (!canCreate) return
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      await mockDataService.createBooking({
        userId: 0,
        restaurantId: restaurant.id,
        tableId: createForm.tableId,
        date: createForm.date,
        time: createForm.time,
        guests: Number(createForm.guests) || 1,
        status: "confirmed",
        userName: createForm.userName.trim(),
        userPhone: createForm.userPhone.trim(),
      })
      toast({ title: "Бронь создана", description: "Бронирование добавлено вручную.", variant: "default" })
      setCreateOpen(false)
      await loadBookings()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось создать бронь"
      setCreateError(msg)
      toast({ title: "Ошибка", description: msg, variant: "destructive" })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleStatus = async (id: string, status: Booking["status"]) => {
    try {
      await mockDataService.updateBookingStatus(id, status)
      await loadBookings()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось обновить статус"
      toast({ title: "Ошибка", description: msg, variant: "destructive" })
    }
  }

  return (
    <div className={styles.bookings}>
      <div className={styles.bookingsHeader}>
        <div>
          <div className={styles.sectionTitle}>Управление бронированиями</div>
        </div>
        <Button onClick={() => void openCreate()}>
          <Plus className={styles.buttonIcon} />
          Создать бронь
        </Button>
      </div>

      <div className={styles.stats}>
        <Card className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Всего</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValueWarning}>{stats.pending}</div>
          <div className={styles.statLabel}>Ожидают</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValueSuccess}>{stats.confirmed}</div>
          <div className={styles.statLabel}>Подтверждено</div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statValueDanger}>{stats.cancelled}</div>
          <div className={styles.statLabel}>Отменено</div>
        </Card>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.search}>
          <Search className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Поиск по имени, телефону или столику..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select className={styles.statusSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">Все бронирования</option>
          <option value="pending">Ожидают</option>
          <option value="confirmed">Подтверждено</option>
          <option value="cancelled">Отменено</option>
          <option value="completed">Завершено</option>
        </select>
      </div>

      <div className={styles.bookingList}>
        {filteredBookings.map((b) => {
          const table = tables.find((t) => t.id === b.tableId)
          const tableNumber = table?.number ?? "-"
          const guestLabel = formatGuests(b.guests)

          return (
            <Card key={b.id} className={styles.bookingCard}>
              <div className={styles.bookingTop}>
                <div>
                  <div className={styles.bookingGuest}>{b.userName ?? "Гость"}</div>
                  <span className={`${styles.statusBadge} ${styles[`status_${b.status}`]}`}>{statusLabel(b.status)}</span>
                </div>
                <div className={styles.bookingRestaurant}>{restaurant.name}</div>
              </div>

              <div className={styles.bookingDetails}>
                <div className={styles.detailRow}>
                  <Calendar className={styles.detailIcon} />
                  <span>{formatDate(b.date)}</span>
                </div>
                <div className={styles.detailRow}>
                  <Clock className={styles.detailIcon} />
                  <span>{b.time}</span>
                </div>
                <div className={styles.detailRow}>
                  <Users className={styles.detailIcon} />
                  <span>{guestLabel}</span>
                </div>
                <div className={styles.tableLine}>
                  <span className={styles.tableLabel}>Столик</span>
                  <span className={styles.tableValue}>№ {tableNumber}</span>
                </div>
              </div>

              {(b.status === "pending" || b.status === "confirmed") && (
                <div className={styles.bookingActions}>
                  <Button variant="outline" onClick={() => void handleStatus(b.id, "cancelled")}>
                    <Ban className={styles.buttonIconSm} />
                    Отменить
                  </Button>
                  {b.status === "pending" ? (
                    <Button onClick={() => void handleStatus(b.id, "confirmed")}>Подтвердить</Button>
                  ) : (
                    <Button variant="outline" onClick={() => void handleStatus(b.id, "completed")}>
                      Завершить
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {filteredBookings.length === 0 && <div className={styles.empty}>Нет бронирований по текущему фильтру</div>}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (createSubmitting) return
          setCreateOpen(open)
        }}
        contentClassName={styles.createDialogShell}
      >
        <DialogContent>
          <div className={styles.dialogTop}>
            <DialogHeader>
              <DialogTitle>Создать бронирование вручную</DialogTitle>
              <DialogDescription>Бронирование по телефонному звонку</DialogDescription>
            </DialogHeader>
            <button className={styles.closeButton} onClick={() => setCreateOpen(false)} aria-label="Закрыть">
              <X className={styles.closeIcon} />
            </button>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <Label>Имя гостя</Label>
              <div className={styles.iconField}>
                <User className={styles.fieldIconStatic} />
                <Input
                  className={styles.iconInput}
                  value={createForm.userName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, userName: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.field}>
              <Label>Телефон</Label>
              <div className={styles.iconField}>
                <Phone className={styles.fieldIconStatic} />
                <Input
                  className={styles.iconInput}
                  value={createForm.userPhone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, userPhone: e.target.value }))}
                />
              </div>
              {!validatePhone(createForm.userPhone) && <div className={styles.formError}>Введите корректный телефон.</div>}
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <Label>Дата</Label>
                <div className={styles.iconField}>
                  <button
                    type="button"
                    className={styles.fieldIconButton}
                    onClick={() => {
                      if (!dateInputRef.current) return
                      if (typeof dateInputRef.current.showPicker === "function") {
                        dateInputRef.current.showPicker()
                      } else {
                        dateInputRef.current.focus()
                      }
                    }}
                    aria-label="Выбрать дату"
                  >
                    <Calendar className={styles.fieldIcon} />
                  </button>
                  <Input
                    className={`${styles.iconInput} ${styles.pickerInput}`}
                    type="date"
                    ref={dateInputRef}
                    value={createForm.date}
                    onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <Label>Время</Label>
                <div className={styles.iconField}>
                  <button
                    type="button"
                    className={styles.fieldIconButton}
                    onClick={() => {
                      if (!timeInputRef.current) return
                      if (typeof timeInputRef.current.showPicker === "function") {
                        timeInputRef.current.showPicker()
                      } else {
                        timeInputRef.current.focus()
                      }
                    }}
                    aria-label="Выбрать время"
                  >
                    <Clock className={styles.fieldIcon} />
                  </button>
                  <Input
                    className={`${styles.iconInput} ${styles.pickerInput}`}
                    type="time"
                    ref={timeInputRef}
                    value={createForm.time}
                    onChange={(e) => setCreateForm((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <Label>Количество гостей</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={createForm.guests}
                onChange={(e) => setCreateForm((p) => ({ ...p, guests: Number(e.target.value) }))}
              />
            </div>

            <div className={styles.field}>
              <Label>Столик</Label>
              <Select value={createForm.tableId} onChange={(e) => setCreateForm((p) => ({ ...p, tableId: e.target.value }))}>
                <option value="" disabled>
                  Выберите столик
                </option>
                {tables
                  .filter((t) => (t.status ?? "available") === "available")
                  .sort((a, b) => a.number - b.number)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Столик № {t.number} • {t.capacity} мест
                    </option>
                  ))}
              </Select>
            </div>

            {createError && <div className={styles.formError}>{createError}</div>}
          </div>

          <div className={styles.dialogActions}>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreate()} disabled={createSubmitting || !canCreate}>
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
