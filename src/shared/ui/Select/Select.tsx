import * as React from "react"
import styles from "./Select.module.scss"
import { cn } from "../../lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select ref={ref} className={cn(styles.select, className)} {...props}>
      {children}
    </select>
  )
})
Select.displayName = "Select"

export { Select }
