import { Link } from "react-router-dom"
import { Button } from "@shared/ui/Button"
import { Card } from "@shared/ui/Card"
import styles from "./NotFoundPage.module.scss"

export function NotFoundPage() {
  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.text}>Страница не найдена.</p>
        <div className={styles.actions}>
          <Link to="/">
            <Button>На главную</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

