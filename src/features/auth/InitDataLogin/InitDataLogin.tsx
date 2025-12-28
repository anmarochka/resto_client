import { useEffect, useRef, useState } from "react"
import { Card } from "@shared/ui/Card"
import { Button } from "@shared/ui/Button"
import { Input } from "@shared/ui/Input"
import { authenticateTelegram, getProfile } from "@shared/api/auth"
import { useTelegram } from "@shared/lib/hooks"
import styles from "./InitDataLogin.module.scss"

type InitDataLoginProps = {
  onAuthenticated: (role: "user" | "admin") => void
}

export function InitDataLogin({ onAuthenticated }: InitDataLoginProps) {
  const { webApp } = useTelegram()
  const [initData, setInitData] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoTriggeredRef = useRef(false)

  useEffect(() => {
    if (webApp?.initData) {
      setInitData(webApp.initData)
    }
  }, [webApp?.initData])

  useEffect(() => {
    if (!webApp?.initData || autoTriggeredRef.current) return
    autoTriggeredRef.current = true
    void handleSubmit(webApp.initData)
  }, [webApp?.initData])

  const handleSubmit = async (overrideInitData?: string) => {
    const payload = (overrideInitData ?? initData).trim()
    if (!payload) return
    setLoading(true)
    setError(null)
    try {
      const token = await authenticateTelegram(payload)
      if (!token) {
        throw new Error("Не удалось получить токен")
      }
      const profile = await getProfile()
      if (!profile?.role) {
        throw new Error("Профиль не найден")
      }
      onAuthenticated(profile.role)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось авторизоваться")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loaderCard}>
              <div className={styles.loaderTitle}>Входим...</div>
              <div className={styles.loaderHint}>Получаем данные из Telegram</div>
            </div>
          </div>
        )}
        <div className={styles.header}>
          <h1 className={styles.title}>Вход</h1>
          <p className={styles.description}>Вставьте Telegram initData, чтобы войти в систему</p>
        </div>

        <Card className={styles.card}>
          <label className={styles.label} htmlFor="initData">
            Telegram initData
          </label>
          <Input
            id="initData"
            className={styles.input}
            value={initData}
            onChange={(e) => setInitData(e.target.value)}
            placeholder="query_id=...&user=...&auth_date=...&hash=..."
            disabled={loading}
          />
          {error && <div className={styles.error}>{error}</div>}
          <Button onClick={() => void handleSubmit()} disabled={loading || !initData.trim()}>
            {loading ? "Входим..." : "Войти"}
          </Button>
        </Card>

        <div className={styles.hint}>
          Если используешь dev‑скрипт генерации, вставь строку initData отсюда.
        </div>
      </div>
    </main>
  )
}
