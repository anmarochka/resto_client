import { AppRouter } from "./providers/router"
import { ToastProvider } from "./providers/toast"
import { AppStateProvider } from "./providers/app-state"

export function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AppStateProvider>
  )
}
