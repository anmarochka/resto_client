export type AppRole = "user" | "admin"

export type AppState = {
  role: AppRole | null
  setRole: (role: AppRole | null) => void
}

