import type React from "react"
import styles from "./Separator.module.scss"

interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  className?: string
}

export const Separator: React.FC<SeparatorProps> = ({ orientation = "horizontal", className }) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`${styles.separator} ${styles[orientation]} ${className || ""}`}
    />
  )
}
