import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTelegram } from "@shared/lib/hooks"
import { RoleSelector } from "@features/auth/RoleSelector"
import { BookingFlow } from "@widgets/booking/BookingFlow"
import { MyBookings } from "@widgets/MyBookings"
import styles from "./HomePage.module.scss"
import { useAppState } from "@app/providers/app-state"
import { Button } from "@shared/ui/Button"

type TabType = "book" | "mybookings"

export function HomePage() {
  const { user, webApp } = useTelegram()
  const navigate = useNavigate()
  const { role, setRole } = useAppState()
  const [activeTab, setActiveTab] = useState<TabType>("book")

  useEffect(() => {
    if (webApp) {
      webApp.ready()
      webApp.expand()
      webApp.enableClosingConfirmation()
    }
  }, [webApp])

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin", { replace: true })
    }
  }, [navigate, role])

  if (!role) {
    return <RoleSelector onSelectRole={setRole} />
  }

  if (role === "admin") {
    return <main className={styles.container} />
  }

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.tabs}>
          <div className={styles.tabsHeader}>
            <div className={styles.tabsList}>
              <button
                className={`${styles.tab} ${activeTab === "book" ? styles.active : ""}`}
                onClick={() => setActiveTab("book")}
              >
                Забронировать
              </button>
              <button
                className={`${styles.tab} ${activeTab === "mybookings" ? styles.active : ""}`}
                onClick={() => setActiveTab("mybookings")}
              >
                Мои брони
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRole(null)}>
              Сменить роль
            </Button>
          </div>
        </div>

        {activeTab === "book" && <BookingFlow user={user} />}
        {activeTab === "mybookings" && <MyBookings userId={user?.id} />}
      </div>
    </main>
  )
}
