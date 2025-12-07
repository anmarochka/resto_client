import { useMemo, useState } from "react"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import styles from "./BookingFlow.module.scss"

interface DateTimeSelectProps {
  restaurantId: string
  initialGuests: number
  onBack: () => void
  onSelect: (date: string, time: string, guests: number) => void
}

export function DateTimeSelect({ restaurantId, initialGuests, onBack, onSelect }: DateTimeSelectProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [guests, setGuests] = useState<number>(initialGuests)

  const dates = useMemo(() => {
    const list: Array<{ label: string; value: string }> = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const value = date.toISOString().split("T")[0]
      const label = date.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "short" })
      list.push({ value, label })
    }
    return list
  }, [])

  const times = useMemo(() => {
    const list: string[] = []
    for (let hour = 12; hour <= 23; hour++) {
      list.push(`${hour.toString().padStart(2, "0")}:00`)
      if (hour < 23) list.push(`${hour.toString().padStart(2, "0")}:30`)
    }
    return list
  }, [])

  const canContinue = Boolean(restaurantId && selectedDate && selectedTime && guests > 0)

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button className={styles.linkButton} onClick={onBack}>
          ← Назад
        </button>
        <h1 className={styles.pageTitle}>Дата и время</h1>
        <p className={styles.pageSubtitle}>Выберите удобное время и количество гостей</p>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Гостей</div>
        <div className={styles.guestRow}>
          <Button variant="outline" onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Уменьшить">
            −
          </Button>
          <div className={styles.guestValue}>{guests}</div>
          <Button variant="outline" onClick={() => setGuests((g) => Math.min(20, g + 1))} aria-label="Увеличить">
            +
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Дата</div>
        <div className={styles.choiceGrid}>
          {dates.map((d) => (
            <Card
              key={d.value}
              className={`${styles.choiceCard} ${selectedDate === d.value ? styles.choiceSelected : ""}`}
              onClick={() => setSelectedDate(d.value)}
            >
              {d.label}
            </Card>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Время</div>
        <div className={styles.choiceGrid}>
          {times.map((t) => (
            <Card
              key={t}
              className={`${styles.choiceCard} ${selectedTime === t ? styles.choiceSelected : ""}`}
              onClick={() => setSelectedTime(t)}
            >
              {t}
            </Card>
          ))}
        </div>
      </div>

      <Button onClick={() => onSelect(selectedDate, selectedTime, guests)} disabled={!canContinue} className={styles.primaryCta}>
        Продолжить
      </Button>
    </div>
  )
}

