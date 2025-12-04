import * as React from "react"
import styles from "./Label.module.scss"
import { cn } from "../../lib/utils"

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return <label ref={ref} className={cn(styles.label, className)} {...props} />
})
Label.displayName = "Label"

export { Label }
