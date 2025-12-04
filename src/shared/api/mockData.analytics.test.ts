import { describe, expect, it } from "vitest"
import { mockDataService } from "./mockData"

describe("mockDataService analytics", () => {
  it("adds live events after booking is created", async () => {
    const restaurantId = "r1"
    const before = await mockDataService.getAnalyticsSnapshot(restaurantId)

    const tables = await mockDataService.getFloorPlan(restaurantId)
    const table = tables.find((t) => (t.status ?? "available") === "available") ?? tables[0]
    expect(table).toBeTruthy()

    const booking = await mockDataService.createBooking({
      userId: 0,
      restaurantId,
      tableId: table!.id,
      date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      time: "19:00",
      guests: 2,
      status: "confirmed",
      userName: "Test User",
      userPhone: "+000 00 000-00-00",
    })

    const after = await mockDataService.getAnalyticsSnapshot(restaurantId)

    expect(after.events.length).toBeGreaterThan(0)
    expect(after.events[0]?.bookingId).toBe(booking.id)
    expect(after.events[0]?.type).toBe("booking_confirmed")
    expect(after.events.length).toBeGreaterThanOrEqual(before.events.length)
  })
})

