import { Card } from "@shared/ui/Card"
import { User, Shield } from "lucide-react"
import styles from "./RoleSelector.module.scss"

interface RoleSelectorProps {
  onSelectRole: (role: "user" | "admin") => void
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Добро пожаловать</h1>
          <p className={styles.description}>Выберите роль для входа в систему бронирования</p>
        </div>

        <div className={styles.roles}>
          <Card className={styles.roleCard} onClick={() => onSelectRole("user")}>
            <div className={styles.roleCardContent}>
              <div className={styles.iconWrapper}>
                <User className={styles.icon} />
              </div>
              <div className={styles.roleInfo}>
                <h2 className={styles.roleTitle}>Пользователь</h2>
                <p className={styles.roleDescription}>Забронировать столик в ресторане, управлять своими бронями</p>
              </div>
            </div>
          </Card>

          <Card className={styles.roleCard} onClick={() => onSelectRole("admin")}>
            <div className={styles.roleCardContent}>
              <div className={`${styles.iconWrapper} ${styles.admin}`}>
                <Shield className={styles.icon} />
              </div>
              <div className={styles.roleInfo}>
                <h2 className={styles.roleTitle}>Администратор</h2>
                <p className={styles.roleDescription}>Управление залами, бронями и схемами ресторанов</p>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.footer}>
          <p>В production версии аутентификация будет через Telegram</p>
        </div>
      </div>
    </main>
  )
}
