import type React from "react"
import { Component } from "react"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import styles from "./ErrorBoundary.module.scss"

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // базовое логирование (можно заменить на отправку в сервис)
    console.error("Unhandled UI error:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.root}>
          <Card className={styles.card}>
            <h1 className={styles.title}>Что-то пошло не так</h1>
            <p className={styles.text}>Попробуйте перезагрузить страницу или вернуться позже.</p>
            <div className={styles.actions}>
              <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
