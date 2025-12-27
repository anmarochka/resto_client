import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MyBookings } from "./MyBookings"
import { dataService } from "@shared/api/dataService"

describe("MyBookings", () => {
  it("shows confirmation dialog before cancelling booking", async () => {
    const user = userEvent.setup()
    const cancelSpy = vi.spyOn(dataService, "cancelBooking")
    vi.spyOn(dataService, "getRestaurants").mockResolvedValue([
      {
        id: "r1",
        name: "La Bella Vista",
        description: "",
        cuisine: "Итальянская",
        image: "",
        rating: 4.8,
        priceRange: "",
        address: "ул. Ленина, 123",
        phone: "",
        openingHours: {
          monday: "12:00-23:00",
          tuesday: "12:00-23:00",
          wednesday: "12:00-23:00",
          thursday: "12:00-23:00",
          friday: "12:00-00:00",
          saturday: "12:00-00:00",
          sunday: "12:00-22:00",
        },
      },
    ])
    vi.spyOn(dataService, "getBookings").mockResolvedValue([
      {
        id: "b1",
        userId: 123456789,
        restaurantId: "r1",
        tableId: "t3",
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        time: "19:00",
        guests: 4,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        userName: "Иван Петров",
        userPhone: "+375 29 123-45-67",
      },
    ])
    vi.spyOn(dataService, "getFloorPlan").mockResolvedValue([
      {
        id: "t3",
        number: 3,
        capacity: 4,
        x: 0,
        y: 0,
        status: "available",
        zone: "main",
      },
    ])

    render(<MyBookings userId={123456789} />)

    expect(await screen.findByText("Мои бронирования")).toBeInTheDocument()
    expect(await screen.findByText("Подтверждено")).toBeInTheDocument()

    const cancelButton = await screen.findByRole("button", { name: /отменить бронирование/i })
    await user.click(cancelButton)

    expect(screen.getByText("Отменить бронирование?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /отменить бронь/i }))

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.queryByText("Отменить бронирование")).not.toBeInTheDocument()
    })
  })
})
