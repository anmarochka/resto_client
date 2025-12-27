import { apiGet, apiPost, getToken, setToken } from "./apiClient"

export type UserProfile = {
  id: string
  fullName: string
  role: "user" | "admin"
  telegramId: string | null
  restaurantId: string | null
}

export async function authenticateTelegram(initData: string) {
  const res = await apiPost<{ accessToken: string }>("/auth/telegram", { initData })
  if (res?.accessToken) {
    setToken(res.accessToken)
  }
  return res.accessToken
}

export async function getProfile() {
  return apiGet<UserProfile>("/users/me")
}

export function ensureDevToken() {
  if (getToken()) return
  const devToken = import.meta.env.VITE_DEV_TOKEN
  if (devToken) {
    setToken(devToken)
  }
}
