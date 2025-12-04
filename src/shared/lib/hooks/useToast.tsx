import { useEffect } from "react"

export type Toast = {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastInput = Omit<Toast, "id">
type ToastListener = (toast: Toast) => void

const listeners = new Set<ToastListener>()

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export function toast(input: ToastInput): Toast {
  const nextToast: Toast = { id: genId(), variant: "default", ...input }
  listeners.forEach((listener) => listener(nextToast))
  return nextToast
}

export function useToastListener(listener: ToastListener) {
  useEffect(() => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [listener])

  return () => listeners.delete(listener)
}
