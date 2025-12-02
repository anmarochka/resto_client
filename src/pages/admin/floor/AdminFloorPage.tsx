import { useOutletContext } from "react-router-dom"
import type { AdminOutletContext } from "../AdminLayout"
import { AdminFloorEditor } from "../AdminFloorEditor"

export function AdminFloorPage() {
  const { restaurant } = useOutletContext<AdminOutletContext>()
  return <AdminFloorEditor restaurantId={restaurant.id} />
}

