import { useState, useEffect } from "react"
import { Card } from "@shared/ui/Card"
import { MapPin, Star, Clock } from "lucide-react"
import { mockDataService } from "@shared/api/mockData"
import type { Restaurant } from "@shared/api/types"
import { toast } from "@shared/lib/hooks"
import placeholderImage from "@/assets/images/placeholder.svg"
import styles from "./BookingFlow.module.scss"

interface RestaurantSelectProps {
  onSelect: (restaurantId: string) => void
}

export function RestaurantSelect({ onSelect }: RestaurantSelectProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await mockDataService.getRestaurants()
        setRestaurants(data)
      } catch (error) {
        toast({
          title: "Ошибка",
          description: error instanceof Error ? error.message : "Не удалось загрузить список ресторанов",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    loadRestaurants()
  }, [])

  if (loading) {
    return (
      <div className={styles.container}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className={styles.skeleton} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Выберите ресторан</h1>
        <p className={styles.pageSubtitle}>Найдите идеальное место для вашего визита</p>
      </div>

      <div className={styles.restaurantList}>
        {restaurants.map((restaurant) => (
          <Card key={restaurant.id} className={styles.restaurantCard} onClick={() => onSelect(restaurant.id)}>
            <div className={styles.restaurantCardContent}>
              <div className={styles.restaurantImage}>
                <img src={restaurant.image || placeholderImage} alt={restaurant.name} />
              </div>
              <div className={styles.restaurantInfo}>
                <div className={styles.restaurantHeader}>
                  <h3 className={styles.restaurantName}>{restaurant.name}</h3>
                  <p className={styles.restaurantCuisine}>{restaurant.cuisine}</p>
                </div>
                <div className={styles.restaurantDetails}>
                  <div className={styles.detail}>
                    <MapPin className={styles.detailIcon} />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className={styles.restaurantMeta}>
                    <div className={styles.rating}>
                      <Star className={styles.starIcon} />
                      <span>{restaurant.rating}</span>
                    </div>
                    <div className={styles.hours}>
                      <Clock className={styles.detailIcon} />
                      <span>{restaurant.openingHours.monday}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
