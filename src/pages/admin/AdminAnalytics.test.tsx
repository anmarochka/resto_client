import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AdminAnalytics } from "./AdminAnalytics"
import { dataService } from "@shared/api/dataService"

describe("AdminAnalytics", () => {
  it("renders live widgets from snapshot", async () => {
    vi.spyOn(dataService, "getAnalyticsSnapshot").mockResolvedValueOnce({
      connected: true,
      bookingsToday: 3,
      currentGuestsLoad: 14,
      peakTime: "19:00",
      activeBookings: 3,
      events: [],
      bookingsByDay: [
        { label: "Пн", bookings: 1, guests: 2 },
        { label: "Вт", bookings: 2, guests: 3 },
        { label: "Ср", bookings: 3, guests: 5 },
        { label: "Чт", bookings: 4, guests: 7 },
        { label: "Пт", bookings: 5, guests: 8 },
        { label: "Сб", bookings: 6, guests: 10 },
        { label: "Вс", bookings: 7, guests: 12 },
      ],
      timeDistribution: [
        { time: "18:30", load: 0.2 },
        { time: "19:00", load: 0.9 },
        { time: "20:00", load: 0.4 },
      ],
      zonePopularity: [
        { categoryId: "window", label: "У окна", percent: 33.3 },
        { categoryId: "main", label: "Основной зал", percent: 33.3 },
        { categoryId: "vip", label: "VIP зона", percent: 33.3 },
      ],
      totals: { totalBookings: 3, avgGuests: 4.7, attendancePercent: 88 },
    })

    render(<AdminAnalytics restaurantId="r1" />)

    expect(await screen.findByText(/Подключено к серверу real-time обновлений/i)).toBeInTheDocument()
    expect(screen.getByText("Бронирований сегодня")).toBeInTheDocument()
    expect(screen.getAllByText("3").length).toBeGreaterThan(0)
    expect(screen.getByText("14")).toBeInTheDocument()
    expect(screen.getAllByText("19:00").length).toBeGreaterThan(0)
  })
})
