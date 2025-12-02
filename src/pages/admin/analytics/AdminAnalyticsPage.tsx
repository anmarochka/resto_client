import { useOutletContext } from "react-router-dom"
import type { AdminOutletContext } from "../AdminLayout"
import { AdminAnalytics } from "../AdminAnalytics"

export function AdminAnalyticsPage() {
  const { restaurant } = useOutletContext<AdminOutletContext>()
  return <AdminAnalytics restaurantId={restaurant.id} />
}

