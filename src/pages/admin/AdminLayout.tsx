import { useCallback, useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { dataService } from "@shared/api/dataService"
import { getProfile } from "@shared/api/auth"
import type { Restaurant } from "@shared/api/types"
import { BarChart3, Calendar, LayoutGrid } from "lucide-react"
import styles from "./AdminPage.module.scss"

export type AdminOutletContext = {
  restaurant: Restaurant
}

export function AdminLayout() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)

  const loadRestaurant = useCallback(async () => {
    try {
      const profile = await getProfile()
      if (!profile?.restaurantId) {
        setRestaurant(null)
        return
      }
      const data = await dataService.getRestaurant(profile.restaurantId)
      setRestaurant(data)
    } catch {
      setRestaurant(null)
    }
  }, [])

  useEffect(() => {
    void loadRestaurant()
  }, [loadRestaurant])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{restaurant ? restaurant.name : "Загрузка..."}</h1>
          <p className={styles.subtitle}>Управление бронированиями и схемой зала</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <NavLink to="/admin/bookings" className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}>
          <Calendar className={styles.tabIcon} />
          Бронирования
        </NavLink>
        <NavLink to="/admin/floor" className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}>
          <LayoutGrid className={styles.tabIcon} />
          Схема зала
        </NavLink>
        <NavLink to="/admin/analytics" className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ""}`}>
          <BarChart3 className={styles.tabIcon} />
          Аналитика
        </NavLink>
      </div>

      <div className={styles.content}>
        {restaurant ? <Outlet context={{ restaurant } satisfies AdminOutletContext} /> : <div className={styles.placeholder}>Загрузка…</div>}
      </div>
    </div>
  )
}
