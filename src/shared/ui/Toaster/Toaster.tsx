import { useState } from "react"
import { useToastListener, type Toast } from "@shared/lib/hooks/useToast"
import styles from "./Toaster.module.scss"

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useToastListener((toast) => {
    setToasts((prev) => [...prev, toast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, 3000)
  })

  return (
    <div className={styles.toaster}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${toast.variant === "destructive" ? styles.destructive : ""}`}>
          <div className={styles.title}>{toast.title}</div>
          {toast.description && <div className={styles.description}>{toast.description}</div>}
        </div>
      ))}
    </div>
  )
}
