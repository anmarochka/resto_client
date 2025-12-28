import { useEffect, useMemo, useState } from "react"
import styles from "./DebugConsole.module.scss"

type LogEntry = {
  level: "log" | "info" | "warn" | "error"
  message: string
  timestamp: string
}

const MAX_ENTRIES = 200

function formatMessage(args: unknown[]) {
  return args
    .map((value) => {
      if (typeof value === "string") return value
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    })
    .join(" ")
}

export function DebugConsole() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])

  useEffect(() => {
    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }

    const push = (level: LogEntry["level"], args: unknown[]) => {
      const entry: LogEntry = {
        level,
        message: formatMessage(args),
        timestamp: new Date().toLocaleTimeString(),
      }
      setEntries((prev) => [...prev.slice(-MAX_ENTRIES + 1), entry])
    }

    console.log = (...args) => {
      push("log", args)
      original.log(...args)
    }
    console.info = (...args) => {
      push("info", args)
      original.info(...args)
    }
    console.warn = (...args) => {
      push("warn", args)
      original.warn(...args)
    }
    console.error = (...args) => {
      push("error", args)
      original.error(...args)
    }

    const onError = (event: ErrorEvent) => {
      push("error", [event.message])
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      push("error", ["Unhandled promise rejection", event.reason])
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)

    return () => {
      console.log = original.log
      console.info = original.info
      console.warn = original.warn
      console.error = original.error
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  const statusText = useMemo(() => {
    const last = entries[entries.length - 1]
    if (!last) return "Console"
    if (last.level === "error") return "Console • Ошибка"
    if (last.level === "warn") return "Console • Warning"
    return "Console"
  }, [entries])

  if (!open) {
    return (
      <button className={styles.fab} type="button" onClick={() => setOpen(true)}>
        {statusText}
      </button>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Консоль</div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setEntries([])}>
            Очистить
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Скрыть
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {entries.length === 0 && <div className={styles.empty}>Нет сообщений</div>}
        {entries.map((entry, index) => (
          <div key={`${entry.timestamp}-${index}`} className={`${styles.line} ${styles[entry.level]}`}>
            <span className={styles.time}>{entry.timestamp}</span>
            <span className={styles.level}>{entry.level.toUpperCase()}</span>
            <pre className={styles.message}>{entry.message}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
