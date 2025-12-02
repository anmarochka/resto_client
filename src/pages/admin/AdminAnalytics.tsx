import { useEffect, useMemo, useState } from "react"
import { Card } from "@shared/ui/Card"
import { mockDataService } from "@shared/api/mockData"
import type { AnalyticsEvent, AnalyticsSnapshot } from "@shared/api/types"
import { Calendar, Clock, Star, Users, Wifi } from "lucide-react"
import { toast } from "@shared/lib/hooks"
import styles from "./AdminAnalytics.module.scss"

function timeAgo(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return "только что"
  if (minutes === 1) return "1 минуту назад"
  if (minutes < 5) return `${minutes} минуты назад`
  return `${minutes} минут назад`
}

function eventBadge(event: AnalyticsEvent) {
  if (event.type === "booking_created") return { label: "Новое бронирование", className: styles.badgeInfo }
  if (event.type === "booking_confirmed") return { label: "Подтверждено", className: styles.badgeSuccess }
  if (event.type === "booking_cancelled") return { label: "Отменено", className: styles.badgeDanger }
  return { label: "Завершено", className: styles.badgeMuted }
}

function SimpleBarChart({
  data,
  height = 180,
}: {
  data: Array<{ label: string; bookings: number; guests: number }>
  height?: number
}) {
  const width = 640
  const padding = 28
  const gap = 10
  const groupWidth = (width - padding * 2) / data.length
  const barWidth = (groupWidth - gap) / 2
  const maxY = Math.max(1, ...data.flatMap((d) => [d.bookings, d.guests]))

  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Бронирования по дням недели">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className={styles.axis} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className={styles.axis} />

      {data.map((d, i) => {
        const x0 = padding + i * groupWidth
        const bookingsH = ((height - padding * 2) * d.bookings) / maxY
        const guestsH = ((height - padding * 2) * d.guests) / maxY
        return (
          <g key={d.label}>
            <rect
              x={x0 + 2}
              y={height - padding - bookingsH}
              width={barWidth}
              height={bookingsH}
              rx="4"
              className={styles.barBookings}
            />
            <rect
              x={x0 + 2 + barWidth + gap}
              y={height - padding - guestsH}
              width={barWidth}
              height={guestsH}
              rx="4"
              className={styles.barGuests}
            />
            <text x={x0 + groupWidth / 2} y={height - 8} textAnchor="middle" className={styles.tick}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SimpleScatter({ points, height = 160 }: { points: Array<{ time: string; load: number }>; height?: number }) {
  const width = 640
  const padding = 28
  const xs = points.map((_, i) => padding + (i * (width - padding * 2)) / Math.max(1, points.length - 1))

  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Распределение по времени">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className={styles.axis} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className={styles.axis} />
      {points.map((p, i) => {
        const x = xs[i] ?? padding
        const y = padding + (1 - Math.max(0, Math.min(1, p.load))) * (height - padding * 2)
        return <circle key={p.time} cx={x} cy={y} r="4.5" className={styles.dot} />
      })}
      {points.map((p, i) => (
        <text key={`${p.time}-t`} x={xs[i]} y={height - 8} textAnchor="middle" className={styles.tick}>
          {p.time}
        </text>
      ))}
    </svg>
  )
}

export function AdminAnalytics({ restaurantId }: { restaurantId: string }) {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const s = await mockDataService.getAnalyticsSnapshot(restaurantId)
        if (alive) setSnapshot(s)
      } catch (e) {
        toast({
          title: "Ошибка",
          description: e instanceof Error ? e.message : "Не удалось загрузить аналитику",
          variant: "destructive",
        })
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 10000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [restaurantId])

  const eventsCountLabel = useMemo(() => {
    const count = snapshot?.events.length ?? 0
    if (count === 1) return "1 событие"
    if (count < 5) return `${count} события`
    return `${count} событий`
  }, [snapshot?.events.length])

  if (!snapshot) {
    return (
      <Card className={styles.loading}>
        <div>Загрузка аналитики…</div>
      </Card>
    )
  }

  return (
    <div className={styles.analytics}>
      <div className={styles.connection}>
        <Wifi className={styles.connectionIcon} />
        <span>Подключено к серверу real-time обновлений</span>
      </div>

      <div className={styles.metrics}>
        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricIconBox}>
              <Calendar className={styles.metricIcon} />
            </div>
            <span className={styles.live}>Live</span>
          </div>
          <div className={styles.metricValue}>{snapshot.bookingsToday}</div>
          <div className={styles.metricLabel}>Бронирований сегодня</div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricIconBoxGreen}>
              <Users className={styles.metricIcon} />
            </div>
            <span className={styles.live}>Live</span>
          </div>
          <div className={styles.metricValue}>{snapshot.currentGuestsLoad}</div>
          <div className={styles.metricLabel}>Текущая загрузка (гости)</div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricIconBoxAmber}>
              <Clock className={styles.metricIcon} />
            </div>
            <span className={styles.live}>Live</span>
          </div>
          <div className={styles.metricValue}>{snapshot.peakTime}</div>
          <div className={styles.metricLabel}>Пиковое время</div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={styles.metricIconBoxRed}>
              <Star className={styles.metricIcon} />
            </div>
            <span className={styles.live}>Live</span>
          </div>
          <div className={styles.metricValue}>{snapshot.activeBookings}</div>
          <div className={styles.metricLabel}>Активных броней</div>
        </Card>
      </div>

      <Card className={styles.eventsCard}>
        <div className={styles.eventsHeader}>
          <div className={styles.eventsTitle}>Live события</div>
          <span className={styles.eventsBadge}>{eventsCountLabel}</span>
        </div>
        <div className={styles.eventsList}>
          {snapshot.events.map((e) => {
            const badge = eventBadge(e)
            return (
              <div key={e.id} className={styles.eventRow}>
                <div className={styles.eventTop}>
                  <span className={`${styles.eventBadge} ${badge.className}`}>{badge.label}</span>
                  <span className={styles.eventTime}>{timeAgo(e.createdAt)}</span>
                </div>
                <div className={styles.eventText}>{e.message}</div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Бронирования по дням недели</div>
          <div className={styles.chartSubtitle}>Статистика за последние 7 дней • Обновляется каждые 10 секунд</div>
        </div>
        <SimpleBarChart data={snapshot.bookingsByDay} />
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatchBookings} /> Бронирования
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatchGuests} /> Гости
          </span>
        </div>
      </Card>

      <Card className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Распределение по времени</div>
          <div className={styles.chartSubtitle}>Загруженность по часам • Real-time данные</div>
        </div>
        <SimpleScatter points={snapshot.timeDistribution} />
      </Card>

      <Card className={styles.zonesCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Популярность зон</div>
          <div className={styles.chartSubtitle}>Распределение бронирований • Real-time данные</div>
        </div>

        <div className={styles.zonesList}>
          {snapshot.zonePopularity.map((z) => (
            <div key={z.categoryId} className={styles.zoneRow}>
              <div className={styles.zoneRowTop}>
                <div className={styles.zoneLabel}>{z.label}</div>
                <div className={styles.zonePercent}>{Math.round(z.percent)}%</div>
              </div>
              <div className={styles.progress}>
                <div className={styles.progressFill} style={{ width: `${z.percent}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.zoneTotals}>
          <div className={styles.totalItem}>
            <div className={styles.totalValue}>{snapshot.totals.totalBookings}</div>
            <div className={styles.totalLabel}>Всего бронир.</div>
          </div>
          <div className={styles.totalItem}>
            <div className={styles.totalValue}>{snapshot.totals.avgGuests}</div>
            <div className={styles.totalLabel}>Ср. гостей</div>
          </div>
          <div className={styles.totalItem}>
            <div className={styles.totalValue}>{snapshot.totals.attendancePercent}%</div>
            <div className={styles.totalLabel}>Явка</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
