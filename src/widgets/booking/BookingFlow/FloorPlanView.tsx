import { useEffect, useMemo, useState } from "react"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import { dataService } from "@shared/api/dataService"
import type { FloorCategory, Table } from "@shared/api/types"
import { Info, Users } from "lucide-react"
import styles from "./BookingFlow.module.scss"

interface FloorPlanViewProps {
  restaurantId: string
  date: string
  time: string
  guests: number
  onBack: () => void
  onSelect: (tableId: string) => void
}

export function FloorPlanView({ restaurantId, date, time, guests, onBack, onSelect }: FloorPlanViewProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [categories, setCategories] = useState<FloorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [data, cats] = await Promise.all([
          dataService.getFloorPlan(restaurantId),
          dataService.getFloorCategories(restaurantId),
        ])
        setTables(data)
        setCategories(cats)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [restaurantId])

  const categoriesSorted = useMemo(() => categories.slice().sort((a, b) => a.order - b.order), [categories])
  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const tablesByZone = useMemo(() => {
    const zones = new Map<string, Table[]>()
    for (const table of [...tables].sort((a, b) => a.number - b.number)) {
      const zoneId = table.zone || "main"
      zones.set(zoneId, [...(zones.get(zoneId) ?? []), table])
    }
    return zones
  }, [tables])

  const selectedTable = useMemo(() => tables.find((t) => t.id === selectedTableId) ?? null, [selectedTableId, tables])

  const canContinue = Boolean(selectedTableId)

  const subtitle = useMemo(() => {
    if (!date || !time) return ""
    const d = new Date(date)
    const formatted = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
    return `${formatted} в ${time}`
  }, [date, time])

  return (
    <div className={styles.container}>
      <div className={styles.floorHeader}>
        <div className={styles.floorHeaderLeft}>
          <button className={styles.linkButton} onClick={onBack}>
            ←
          </button>
          <div>
            <h1 className={styles.pageTitle}>Выберите столик</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
        </div>
        <div className={styles.guestBadge} title="Гостей">
          <Users className={styles.guestIcon} />
          <span>{guests}</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.section}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <>
          <Card className={styles.legendCard}>
            <div className={styles.legendTitle}>
              <Info className={styles.legendIcon} />
              <span>Описание</span>
            </div>
            <div className={styles.legendRow}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${styles.legendAvailable}`} />
                <span>Доступен</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${styles.legendSelected}`} />
                <span>Выбранный</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendSwatch} ${styles.legendNoSeats}`} />
                <span>Нет мест</span>
              </div>
            </div>
          </Card>

          <Card className={styles.zonesCard}>
            {(categoriesSorted.length ? categoriesSorted.map((c) => c.id) : Array.from(tablesByZone.keys())).map(
              (zoneId) => {
                const zoneTables = tablesByZone.get(zoneId) ?? []
                const zoneTitle = categoryById[zoneId]?.title ?? zoneId
                const bg = categoryById[zoneId]?.backgroundColor

                if (zoneTables.length === 0) return null

                return (
                  <div key={zoneId} className={styles.zoneSection}>
                    <div className={styles.zoneTitle}>{zoneTitle}</div>
                    <div className={styles.zoneGrid} style={bg ? { background: bg } : undefined}>
                      {zoneTables.map((t) => {
                    const status = t.status ?? "available"
                    const hasSeats = t.capacity >= guests
                    const isDisabled = status !== "available" || !hasSeats
                    const isSelected = selectedTableId === t.id
                    const isCircle = (t.shape ?? "circle") === "circle"

                    const stateClass = isSelected
                      ? styles.tableSelected
                      : isDisabled
                        ? styles.tableNoSeats
                        : styles.tableAvailable

                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.tableButton} ${isCircle ? styles.tableCircle : styles.tableRect} ${stateClass}`}
                        onClick={() => {
                          if (isDisabled) return
                          setSelectedTableId(t.id)
                        }}
                        disabled={isDisabled}
                        aria-pressed={isSelected}
                        aria-label={`Столик ${t.number}, ${t.capacity} мест`}
                      >
                        <div className={styles.tableNumber}>{t.number}</div>
                        <div className={styles.tableSeats}>{t.capacity} мест</div>
                      </button>
                    )
                      })}
                    </div>
                  </div>
                )
              },
            )}
          </Card>

          {selectedTable && (
            <Card className={styles.selectedCard}>
              <div className={styles.selectedHeader}>
                <div className={styles.selectedTitle}>Столик {selectedTable.number}</div>
                <span className={styles.zoneChip}>{categoryById[selectedTable.zone]?.title ?? selectedTable.zone}</span>
              </div>
              <div className={styles.selectedMeta}>{selectedTable.capacity} мест</div>
            </Card>
          )}
        </>
      )}

      <Button
        onClick={() => selectedTableId && onSelect(selectedTableId)}
        disabled={!canContinue}
        className={styles.primaryCta}
      >
        Забронировать
      </Button>
    </div>
  )
}
