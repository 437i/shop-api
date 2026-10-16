import type { ReactNode } from "react"
import { Navigate } from "react-router"

import { getAuthToken } from "@/shared/api/client"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!getAuthToken()) {
    return <Navigate to="/auth/login" replace />
  }

  return children
}
