import { Navigate, Outlet, useLocation } from "react-router-dom"
import type { AppRole } from "../app-state"
import { useAppState } from "../app-state"

export function RequireRole({ role }: { role: AppRole }) {
  const { role: currentRole } = useAppState()
  const location = useLocation()

  if (!currentRole) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (currentRole !== role) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
