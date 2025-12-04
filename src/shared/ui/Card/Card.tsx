import { type HTMLAttributes, forwardRef } from "react"
import { cn } from "@shared/lib/utils"
import styles from "./Card.module.scss"

export type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn(styles.card, className)} {...props} />
})

Card.displayName = "Card"
