import { useCallback, useEffect, useMemo, useState } from "react"
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

  const setRole = useCallback((nextRole: AppRole | null) => {
    setRoleState(nextRole)
    if (typeof window === "undefined") return
    if (nextRole) window.localStorage.setItem(STORAGE_KEY, nextRole)
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ role, setRole }), [role, setRole])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
