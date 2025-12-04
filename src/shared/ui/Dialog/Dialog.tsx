import type * as React from "react"
import styles from "./Dialog.module.scss"
import { cn } from "../../lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  contentClassName?: string
  overlayClassName?: string
}

export function Dialog({ open, onOpenChange, children, contentClassName, overlayClassName }: DialogProps) {
  if (!open) return null

  return (
    <div className={cn(styles.overlay, overlayClassName)} onClick={() => onOpenChange(false)}>
      <div className={cn(styles.content, contentClassName)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export function DialogContent({ children, className }: DialogContentProps) {
  return <div className={cn(styles.dialogContent, className)}>{children}</div>
}

interface DialogHeaderProps {
  children: React.ReactNode
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className={styles.header}>{children}</div>
}

interface DialogTitleProps {
  children: React.ReactNode
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className={styles.title}>{children}</h2>
}

interface DialogDescriptionProps {
  children: React.ReactNode
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className={styles.description}>{children}</p>
}
