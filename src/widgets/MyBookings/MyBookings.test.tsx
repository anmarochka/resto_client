import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MyBookings } from "./MyBookings"
import { mockDataService } from "@shared/api/mockData"

describe("MyBookings", () => {
  it("shows confirmation dialog before cancelling booking", async () => {
    const user = userEvent.setup()
    const cancelSpy = vi.spyOn(mockDataService, "cancelBooking")

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
