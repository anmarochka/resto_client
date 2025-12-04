import type * as React from "react"
import styles from "./Badge.module.scss"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn(styles.badge, styles[variant], className)} {...props} />
}

export { Badge }
