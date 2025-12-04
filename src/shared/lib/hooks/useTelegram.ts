import { useEffect, useState } from "react"

type TelegramUser = NonNullable<TelegramWebApp["initDataUnsafe"]["user"]>

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const app = window.Telegram.WebApp
      setWebApp(app)
      setUser(app.initDataUnsafe.user || null)
    }
  }, [])

  return { webApp, user }
}
