import type { DragEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@shared/ui/Dialog"
import { Input } from "@shared/ui/Input"
import { Label } from "@shared/ui/Label"
import { Select } from "@shared/ui/Select"
import { mockDataService } from "@shared/api/mockData"
import type { FloorCategory, FloorPlanState, Table } from "@shared/api/types"
import { ArrowDown, ArrowUp, Move, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { toast } from "@shared/lib/hooks"
import styles from "./AdminFloorEditor.module.scss"

type DragPayload = { tableId: string; fromCategoryId: string }

const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`

function moveItem<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = list.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function AdminFloorEditor({ restaurantId }: { restaurantId: string }) {
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)

  const [categories, setCategories] = useState<FloorCategory[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [orderByCategory, setOrderByCategory] = useState<Record<string, string[]>>({})

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState({ title: "", backgroundColor: "oklch(0.98 0.005 262)" })

  const categoriesSorted = useMemo(() => categories.slice().sort((a, b) => a.order - b.order), [categories])
  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [selectedTableId, tables],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const state = await mockDataService.getFloorPlanState(restaurantId)
      setCategories(state.categories)
      setTables(state.tables)
      setOrderByCategory(state.orderByCategory)
      setDirty(false)
      setSelectedTableId(null)
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось загрузить схему зала",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    void load()
  }, [load])

  const setStateDirty = () => setDirty(true)

  const handleSave = async () => {
    try {
      const state: FloorPlanState = { categories, tables, orderByCategory }
      await mockDataService.saveFloorPlanState(restaurantId, state)
      setDirty(false)
      toast({ title: "Сохранено", description: "Схема зала обновлена.", variant: "default" })
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить схему зала",
        variant: "destructive",
      })
    }
  }

  const handleAddTable = () => {
    const targetCategoryId = categoriesSorted[0]?.id
    if (!targetCategoryId) return

    const maxNumber = Math.max(0, ...tables.map((t) => t.number))
    const id = createId("t")

    const nextTable: Table = {
      id,
      number: maxNumber + 1,
      capacity: 2,
      x: 0,
      y: 0,
      shape: "circle",
      status: "available",
      zone: targetCategoryId,
    }

    setTables((prev) => [...prev, nextTable])
    setOrderByCategory((prev) => ({
      ...prev,
      [targetCategoryId]: [...(prev[targetCategoryId] ?? []), id],
    }))
    setSelectedTableId(id)
    setStateDirty()
  }

  const handleDeleteTable = () => {
    if (!selectedTableId || !selectedTable) return
    const tableId = selectedTableId
    setTables((prev) => prev.filter((t) => t.id !== tableId))
    setOrderByCategory((prev) => {
      const next: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(prev)) next[k] = v.filter((id) => id !== tableId)
      return next
    })
    setSelectedTableId(null)
    setStateDirty()
  }

  const handleDragStart = (payload: DragPayload, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("application/json", JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"
  }

  const handleDropOnCategory = (categoryId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData("application/json")
    const payload = raw ? (JSON.parse(raw) as DragPayload) : null
    if (!payload?.tableId) return

    const { tableId, fromCategoryId } = payload
    if (fromCategoryId === categoryId) {
      // drop to end (reorder)
      setOrderByCategory((prev) => {
        const list = prev[categoryId] ?? []
        if (!list.includes(tableId)) return prev
        const nextList = [...list.filter((id) => id !== tableId), tableId]
        setStateDirty()
        return { ...prev, [categoryId]: nextList }
      })
      return
    }

    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, zone: categoryId } : t)))
    setOrderByCategory((prev) => {
      const fromList = prev[fromCategoryId] ?? []
      const toList = prev[categoryId] ?? []
      const next = {
        ...prev,
        [fromCategoryId]: fromList.filter((id) => id !== tableId),
        [categoryId]: [...toList, tableId],
      }
      setStateDirty()
      return next
    })
  }

  const handleDropOnTable = (categoryId: string, targetTableId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData("application/json")
    const payload = raw ? (JSON.parse(raw) as DragPayload) : null
    if (!payload?.tableId) return
    const { tableId, fromCategoryId } = payload

    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, zone: categoryId } : t)))
    setOrderByCategory((prev) => {
      const next: Record<string, string[]> = { ...prev }
      for (const key of Object.keys(next)) next[key] = [...(next[key] ?? [])]

      const fromList = next[fromCategoryId] ?? []
      next[fromCategoryId] = fromList.filter((id) => id !== tableId)

      const toList = next[categoryId] ?? []
      const without = toList.filter((id) => id !== tableId)
      const targetIndex = without.indexOf(targetTableId)
      const insertIndex = targetIndex === -1 ? without.length : targetIndex
      without.splice(insertIndex, 0, tableId)
      next[categoryId] = without

      setStateDirty()
      return next
    })
  }

  const tablesByCategory = useMemo(() => {
    const map = new Map<string, Table[]>()
    for (const t of tables) {
      map.set(t.zone, [...(map.get(t.zone) ?? []), t])
    }
    return map
  }, [tables])

  const orderedTablesForCategory = useCallback(
    (categoryId: string) => {
      const list = orderByCategory[categoryId] ?? []
      const map = new Map((tablesByCategory.get(categoryId) ?? []).map((t) => [t.id, t]))
      const ordered = list.map((id) => map.get(id)).filter(Boolean) as Table[]
      const remaining = Array.from(map.values()).filter((t) => !list.includes(t.id)).sort((a, b) => a.number - b.number)
      return [...ordered, ...remaining]
    },
    [orderByCategory, tablesByCategory],
  )

  const openCreateCategory = () => {
    setEditingCategoryId(null)
    setCategoryForm({ title: "", backgroundColor: "oklch(0.98 0.005 262)" })
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (categoryId: string) => {
    const cat = categoriesById[categoryId]
    if (!cat) return
    setEditingCategoryId(categoryId)
    setCategoryForm({ title: cat.title, backgroundColor: cat.backgroundColor })
    setCategoryDialogOpen(true)
  }

  const saveCategory = () => {
    const title = categoryForm.title.trim()
    const backgroundColor = categoryForm.backgroundColor.trim()
    if (!title) return

    if (editingCategoryId) {
      setCategories((prev) => prev.map((c) => (c.id === editingCategoryId ? { ...c, title, backgroundColor } : c)))
    } else {
      const maxOrder = Math.max(0, ...categories.map((c) => c.order))
      const id = createId("cat")
      const next: FloorCategory = { id, title, backgroundColor, order: maxOrder + 1 }
      setCategories((prev) => [...prev, next])
      setOrderByCategory((prev) => ({ ...prev, [id]: [] }))
    }
    setCategoryDialogOpen(false)
    setEditingCategoryId(null)
    setStateDirty()
  }

  const deleteCategory = (categoryId: string) => {
    const remaining = categoriesSorted.filter((c) => c.id !== categoryId)
    const fallback = remaining[0]?.id
    if (!fallback) return

    setTables((prev) => prev.map((t) => (t.zone === categoryId ? { ...t, zone: fallback } : t)))
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    setOrderByCategory((prev) => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
    if (selectedTable?.zone === categoryId) setSelectedTableId(null)
    setStateDirty()
  }

  const moveCategory = (categoryId: string, direction: "up" | "down") => {
    const idx = categoriesSorted.findIndex((c) => c.id === categoryId)
    if (idx === -1) return
    const nextIdx = direction === "up" ? idx - 1 : idx + 1
    if (nextIdx < 0 || nextIdx >= categoriesSorted.length) return
    const nextSorted = moveItem(categoriesSorted, idx, nextIdx).map((c, i) => ({ ...c, order: i + 1 }))
    setCategories(nextSorted)
    setStateDirty()
  }

  const updateSelectedTable = (patch: Partial<Table>) => {
    if (!selectedTableId) return
    setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, ...patch } : t)))
    setStateDirty()
  }

  const updateSelectedTableCategory = (categoryId: string) => {
    if (!selectedTableId || !selectedTable) return
    const fromCategoryId = selectedTable.zone
    if (fromCategoryId === categoryId) return

    updateSelectedTable({ zone: categoryId })
    setOrderByCategory((prev) => {
      const fromList = prev[fromCategoryId] ?? []
      const toList = prev[categoryId] ?? []
      return {
        ...prev,
        [fromCategoryId]: fromList.filter((id) => id !== selectedTableId),
        [categoryId]: [...toList, selectedTableId],
      }
    })
  }

  if (loading) {
    return (
      <Card className={styles.loading}>
        <div>Загрузка схемы зала…</div>
      </Card>
    )
  }

  return (
    <div className={styles.editor}>
      <div className={styles.top}>
        <div>
          <div className={styles.title}>Редактор схемы зала</div>
        </div>
        <div className={styles.topActions}>
          <Button variant="outline" onClick={handleAddTable}>
            <Plus className={styles.icon} />
            Добавить столик
          </Button>
          <Button onClick={() => void handleSave()} disabled={!dirty}>
            <Save className={styles.icon} />
            Сохранить
          </Button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          <Card className={styles.planCard}>
            {categoriesSorted.map((cat) => {
              const zoneTables = orderedTablesForCategory(cat.id)
              return (
                <div key={cat.id} className={styles.zoneSection}>
                  <div className={styles.zoneTitle}>{cat.title}</div>
                  <div
                    className={styles.zoneGrid}
                    style={{ background: cat.backgroundColor }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnCategory(cat.id, e)}
                  >
                    {zoneTables.map((t) => {
                      const isSelected = selectedTableId === t.id
                      const isCircle = (t.shape ?? "circle") === "circle"
                      const isOccupied = (t.status ?? "available") !== "available"
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={[
                            styles.table,
                            isCircle ? styles.circle : styles.rect,
                            isSelected ? styles.selected : "",
                            isOccupied ? styles.blocked : "",
                          ].join(" ")}
                          onClick={() => setSelectedTableId(t.id)}
                          draggable
                          onDragStart={(e) => handleDragStart({ tableId: t.id, fromCategoryId: cat.id }, e)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnTable(cat.id, t.id, e)}
                        >
                          <div className={styles.tableNumber}>{t.number}</div>
                          <div className={styles.tableSeats}>{t.capacity} мест</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </Card>

          <Card className={styles.tableEditorCard}>
            {selectedTable ? (
              <>
                <div className={styles.tableEditorHeader}>
                  <div className={styles.tableEditorTitle}>Столик {selectedTable.number}</div>
                  <button className={styles.deleteBtn} onClick={handleDeleteTable} aria-label="Удалить столик">
                    <Trash2 className={styles.deleteIcon} />
                  </button>
                </div>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <Label>Номер столика</Label>
                    <Input
                      type="number"
                      min={1}
                      value={selectedTable.number}
                      onChange={(e) => updateSelectedTable({ number: Number(e.target.value) })}
                    />
                  </div>
                  <div className={styles.field}>
                    <Label>Вместимость</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={selectedTable.capacity}
                      onChange={(e) => updateSelectedTable({ capacity: Number(e.target.value) })}
                    />
                  </div>
                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <Label>Форма</Label>
                      <Select
                        value={selectedTable.shape ?? "circle"}
                        onChange={(e) => updateSelectedTable({ shape: e.target.value as Table["shape"] })}
                      >
                        <option value="circle">Круг</option>
                        <option value="rectangle">Прямоугольник</option>
                      </Select>
                    </div>
                    <div className={styles.field}>
                      <Label>Статус</Label>
                      <Select
                        value={selectedTable.status ?? "available"}
                        onChange={(e) => updateSelectedTable({ status: e.target.value as Table["status"] })}
                      >
                        <option value="available">Доступен</option>
                        <option value="reserved">Забронирован</option>
                        <option value="occupied">Занят</option>
                      </Select>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <Label>Категория места</Label>
                    <Select value={selectedTable.zone} onChange={(e) => updateSelectedTableCategory(e.target.value)}>
                      {categoriesSorted.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyEditor}>
                <Move className={styles.emptyIcon} />
                <div className={styles.emptyText}>Выберите столик для редактирования</div>
              </div>
            )}
          </Card>

          <Card className={styles.categoriesCard}>
            <div className={styles.categoriesHeader}>
              <div>
                <div className={styles.categoriesTitle}>Категории мест</div>
                <div className={styles.categoriesSubtitle}>Управляйте категориями и их порядком</div>
              </div>
              <Button onClick={openCreateCategory}>
                <Plus className={styles.icon} />
                Добавить категорию
              </Button>
            </div>

            <div className={styles.categoryList}>
              {categoriesSorted.map((c) => {
                const count = (tablesByCategory.get(c.id) ?? []).length
                const label = count === 1 ? "1 столик" : `${count} столиков`
                return (
                  <div key={c.id} className={styles.categoryRow}>
                    <div className={styles.categoryLeft}>
                      <div className={styles.categorySwatch} style={{ background: c.backgroundColor }} />
                      <div>
                        <div className={styles.categoryName}>{c.title}</div>
                        <div className={styles.categoryCount}>{label}</div>
                      </div>
                    </div>
                    <div className={styles.categoryActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => moveCategory(c.id, "up")}
                        aria-label="Выше"
                        disabled={categoriesSorted[0]?.id === c.id}
                      >
                        <ArrowUp className={styles.iconSm} />
                      </button>
                      <button
                        className={styles.iconBtn}
                        onClick={() => moveCategory(c.id, "down")}
                        aria-label="Ниже"
                        disabled={categoriesSorted[categoriesSorted.length - 1]?.id === c.id}
                      >
                        <ArrowDown className={styles.iconSm} />
                      </button>
                      <button className={styles.iconBtn} onClick={() => openEditCategory(c.id)} aria-label="Редактировать">
                        <Pencil className={styles.iconSm} />
                      </button>
                      <button
                        className={styles.iconBtnDanger}
                        onClick={() => deleteCategory(c.id)}
                        aria-label="Удалить"
                        disabled={categoriesSorted.length <= 1}
                      >
                        <Trash2 className={styles.iconSm} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open)
          if (!open) setEditingCategoryId(null)
        }}
        contentClassName={styles.categoryDialogShell}
      >
        <DialogContent>
          <div className={styles.dialogTop}>
            <DialogHeader>
              <DialogTitle>{editingCategoryId ? "Редактировать категорию" : "Создать категорию"}</DialogTitle>
              <DialogDescription> </DialogDescription>
            </DialogHeader>
            <button className={styles.closeButton} onClick={() => setCategoryDialogOpen(false)} aria-label="Закрыть">
              <X className={styles.closeIcon} />
            </button>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <Label>Название категории</Label>
              <Input
                placeholder="Например: У окна"
                value={categoryForm.title}
                onChange={(e) => setCategoryForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <Label>Цвет фона</Label>
              <div className={styles.colorRow}>
                <Input
                  value={categoryForm.backgroundColor}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, backgroundColor: e.target.value }))}
                />
                <div className={styles.colorPreview} style={{ background: categoryForm.backgroundColor }} />
              </div>
              <div className={styles.hint}>Используйте формат OKLCH для цвета</div>
            </div>
          </div>

          <div className={styles.dialogActions}>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveCategory}>{editingCategoryId ? "Сохранить" : "Создать"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {dirty && <div className={styles.dirtyHint}>Есть несохранённые изменения</div>}
    </div>
  )
}
