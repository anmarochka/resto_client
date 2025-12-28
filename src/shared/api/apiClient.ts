const RAW_API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
const API_BASE = RAW_API_BASE.startsWith("http") ? RAW_API_BASE : `https://${RAW_API_BASE}`
const TOKEN_KEY = "rb_auth_token"

export type ApiError = {
  message?: string
  error?: string
  statusCode?: number
}

export function getToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return null as T

  const contentType = res.headers.get("content-type") ?? ""
  const looksJson = contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")
  if (!looksJson) return text as T

  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await parseResponse<any>(res)

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data
        : (data as ApiError)?.message || res.statusText || "Request failed"
    throw new Error(Array.isArray(message) ? message.join(", ") : message)
  }

  return data as T
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path)
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function apiPatch<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" })
}
