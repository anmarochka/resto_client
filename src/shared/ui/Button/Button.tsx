import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@shared/lib/utils"
import styles from "./Button.module.scss"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return <button className={cn(styles.button, styles[variant], styles[size], className)} ref={ref} {...props} />
  },
)

Button.displayName = "Button"
