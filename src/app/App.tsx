import { AppRouter } from "./providers/router"
import { ToastProvider } from "./providers/toast"
import { AppStateProvider } from "./providers/app-state"
import { DebugConsole } from "@shared/ui"

export function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppRouter />
        <DebugConsole />
      </ToastProvider>
    </AppStateProvider>
  )
}
