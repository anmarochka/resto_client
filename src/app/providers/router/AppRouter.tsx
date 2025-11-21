import { Navigate, Route, Routes } from "react-router-dom"
import { RequireRole } from "@app/providers/auth"
import { HomePage } from "@pages/home"
import { AdminLayout } from "@pages/admin/AdminLayout"
import { AdminBookingsPage } from "@pages/admin/bookings/AdminBookingsPage"
import { AdminFloorPage } from "@pages/admin/floor/AdminFloorPage"
import { AdminAnalyticsPage } from "@pages/admin/analytics/AdminAnalyticsPage"
import { NotFoundPage } from "@pages/not-found"

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/bookings" replace />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="floor" element={<AdminFloorPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
