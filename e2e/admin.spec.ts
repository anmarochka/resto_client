import { test, expect } from "@playwright/test"

test("admin bookings -> analytics navigation", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rb_app_role", "admin")
  })

  await page.goto("/admin/bookings")
  await expect(page.getByText("Управление бронированиями")).toBeVisible()

  await page.getByText("Аналитика").click()
  await expect(page.getByText(/Подключено к серверу real-time обновлений/i)).toBeVisible()
})

