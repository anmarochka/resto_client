import { useEffect, useMemo, useState } from "react"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import { dataService } from "@shared/api/dataService"
import type { Restaurant, Table } from "@shared/api/types"
import { Calendar, Clock, MapPin, User, Users } from "lucide-react"
import styles from "./BookingFlow.module.scss"

interface BookingConfirmationProps {
  bookingData: {
    restaurantId: string
    date: string
    time: string
    guests: number
    tableId: string
  }
  user:
    | {
        id: number
        first_name: string
        last_name?: string
        username?: string
      }
    | null
  onBack: () => void
  onComplete: () => void
}

export function BookingConfirmation({ bookingData, user, onBack, onComplete }: BookingConfirmationProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const r = await dataService.getRestaurant(bookingData.restaurantId)
      setRestaurant(r)
      const tables = await dataService.getFloorPlan(bookingData.restaurantId)
      setTable(tables.find((t) => t.id === bookingData.tableId) ?? null)
    }
    void load()
  }, [bookingData.restaurantId, bookingData.tableId])

  const formattedDate = useMemo(() => {
    const date = new Date(bookingData.date)
    return date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })
  }, [bookingData.date])

  const formattedGuests = useMemo(() => {
    const n = bookingData.guests
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return `${n} человек`
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} человека`
    return `${n} человек`
  }, [bookingData.guests])

  const userDisplayName = useMemo(() => {
    if (!user) return "Гость"
    const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
    return full || user.username || "Гость"
  }, [user])

  const userInitial = useMemo(() => {
    const raw = user?.first_name?.trim()?.[0] ?? user?.username?.trim()?.[0] ?? "Г"
    return raw.toUpperCase()
  }, [user])

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const userName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : undefined

      if (!table) {
        throw new Error("Столик не найден")
      }

      await dataService.createBooking({
        restaurantId: bookingData.restaurantId,
        hallId: table.zone,
        tableId: bookingData.tableId,
        date: bookingData.date,
        time: bookingData.time,
        guests: bookingData.guests,
        userName,
      })
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать бронирование")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.confirmHeader}>
        <div className={styles.confirmHeaderLeft}>
          <button className={styles.linkButton} onClick={onBack} aria-label="Назад">
            ←
          </button>
          <div>
            <h1 className={styles.pageTitle}>Подтверждение</h1>
            <p className={styles.pageSubtitle}>Проверьте детали бронирования</p>
          </div>
        </div>
      </div>

      <Card className={styles.confirmSectionCard}>
        <div className={styles.sectionCardTitle}>Гость</div>
        <div className={styles.guestRow}>
          <div className={styles.guestAvatar} aria-hidden="true">
            {userInitial}
          </div>
          <div className={styles.guestInfo}>
            <div className={styles.guestName}>{userDisplayName}</div>
            <div className={styles.guestSub}>
              <User className={styles.inlineIcon} />
              <span>Профиль Telegram</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.confirmSectionCard}>
        <div className={styles.sectionCardTitle}>Ресторан</div>
        <div className={styles.restaurantBlock}>
          <div className={styles.restaurantName}>{restaurant?.name ?? "Загрузка..."}</div>
          <div className={styles.restaurantAddress}>
            <MapPin className={styles.inlineIcon} />
            <span>{restaurant?.address ?? "—"}</span>
          </div>
        </div>
      </Card>

      <Card className={styles.confirmSectionCard}>
        <div className={styles.sectionCardTitle}>Детали бронирования</div>

        <div className={styles.detailsList}>
          <div className={styles.detailsItem}>
            <div className={styles.detailsIconBox}>
              <Calendar className={styles.detailsIcon} />
            </div>
            <div className={styles.detailsText}>
              <div className={styles.detailsLabel}>Дата</div>
              <div className={styles.detailsValue}>{formattedDate}</div>
            </div>
          </div>

          <div className={styles.detailsItem}>
            <div className={styles.detailsIconBox}>
              <Clock className={styles.detailsIcon} />
            </div>
            <div className={styles.detailsText}>
              <div className={styles.detailsLabel}>Время</div>
              <div className={styles.detailsValue}>{bookingData.time}</div>
            </div>
          </div>

          <div className={styles.detailsItem}>
            <div className={styles.detailsIconBox}>
              <Users className={styles.detailsIcon} />
            </div>
            <div className={styles.detailsText}>
              <div className={styles.detailsLabel}>Гости</div>
              <div className={styles.detailsValue}>{formattedGuests}</div>
            </div>
          </div>
        </div>

        <div className={styles.detailsDivider} />

        <div className={styles.tableRow}>
          <div className={styles.tableRowLabel}>Столик</div>
          <div className={styles.tablePill}>{table ? `№ ${table.number}` : "—"}</div>
        </div>
      </Card>

      <Card className={styles.disclaimerCard}>
        <div className={styles.disclaimerText}>
          Нажимая “Подтвердить бронирование”, вы соглашаетесь с условиями бронирования. Вы можете отменить бронь не
          позднее чем за 1 час до визита.
        </div>
      </Card>

      {error && <div className={styles.error}>{error}</div>}

      <Button onClick={handleConfirm} disabled={submitting || !restaurant || !table} className={styles.primaryCta}>
        {submitting ? "Создание..." : "Подтвердить бронирование"}
      </Button>
    </div>
  )
}
