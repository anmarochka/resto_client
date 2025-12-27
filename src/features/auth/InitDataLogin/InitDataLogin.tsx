import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (webApp?.initData) {
      setInitData(webApp.initData)
    }
  }, [webApp?.initData])

  const handleSubmit = async () => {
    if (!initData.trim()) return
    setLoading(true)
    setError(null)
    try {
      const token = await authenticateTelegram(initData.trim())
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
