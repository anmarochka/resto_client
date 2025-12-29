import { useCallback, useEffect, useMemo, useState } from "react"
import { clearToken } from "@shared/api/apiClient"
import { AppStateContext } from "./AppStateContext"
import type { AppRole } from "./types"

const STORAGE_KEY = "rb_app_role"

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<AppRole | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === "user" || raw === "admin") setRoleState(raw)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const clearSession = () => {
      clearToken()
      window.localStorage.removeItem(STORAGE_KEY)
      setRoleState(null)
    }

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") clearSession()
    }

    window.addEventListener("pagehide", clearSession)
    window.addEventListener("beforeunload", clearSession)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("pagehide", clearSession)
      window.removeEventListener("beforeunload", clearSession)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  const setRole = useCallback((nextRole: AppRole | null) => {
    setRoleState(nextRole)
    if (typeof window === "undefined") return
    if (nextRole) window.localStorage.setItem(STORAGE_KEY, nextRole)
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ role, setRole }), [role, setRole])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
