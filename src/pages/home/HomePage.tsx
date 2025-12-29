import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTelegram } from "@shared/lib/hooks"
import { BookingFlow } from "@widgets/booking/BookingFlow"
import { MyBookings } from "@widgets/MyBookings"
import styles from "./HomePage.module.scss"
import { useAppState } from "@app/providers/app-state"
import { Card } from "@shared/ui/Card"
import { authenticateTelegram, getProfile } from "@shared/api/auth"

type TabType = "book" | "mybookings"

export function HomePage() {
  const { user, webApp } = useTelegram()
  const navigate = useNavigate()
  const { role, setRole } = useAppState()
  const [activeTab, setActiveTab] = useState<TabType>("book")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    if (webApp) {
      webApp.ready()
      webApp.expand()
      webApp.enableClosingConfirmation()
    }
  }, [webApp])

  useEffect(() => {
    let cancelled = false
    const bootstrapAuth = async () => {
      if (role) return
      if (!webApp?.initData) {
        setAuthError("Не удалось получить данные Telegram. Перезапустите Mini App.")
        return
      }
      setAuthLoading(true)
      setAuthError(null)
      try {
        await authenticateTelegram(webApp.initData)
        const profile = await getProfile()
        if (!cancelled && profile?.role) {
          setRole(profile.role)
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Не удалось авторизоваться"
          setAuthError(message)
        }
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }

    void bootstrapAuth()
    return () => {
      cancelled = true
    }
  }, [role, setRole, webApp])

  useEffect(() => {
    if (role === "admin") {
      navigate("/admin", { replace: true })
    }
  }, [navigate, role])

  if (!role) {
    return (
      <main className={styles.authContainer}>
        <Card className={styles.authCard}>
          <div className={styles.authTitle}>Вход</div>
          <div className={styles.authText}>
            {authLoading ? "Входим в систему..." : "Ожидаем данные из Telegram"}
          </div>
          {authError && <div className={styles.authError}>{authError}</div>}
        </Card>
      </main>
    )
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
          </div>
        </div>

        {activeTab === "book" && <BookingFlow user={user} />}
        {activeTab === "mybookings" && <MyBookings userId={user?.id} />}
      </div>
    </main>
  )
}
