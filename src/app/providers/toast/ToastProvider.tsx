import type React from "react"
import { Toaster } from "@shared/ui/Toaster"

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
