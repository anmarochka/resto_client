import { createContext } from "react"
import type { AppState } from "./types"

export const AppStateContext = createContext<AppState | null>(null)

