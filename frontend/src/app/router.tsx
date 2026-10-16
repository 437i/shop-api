import type { RouteObject } from "react-router"
import { Navigate, createBrowserRouter } from "react-router"

import { NotFoundPage } from "@/pages/NotFoundPage"
import { LoginPage } from "@/pages/auth/LoginPage"
import { ClientsListPage } from "@/pages/clients/ClientsListPage"

import { ProtectedRoute } from "./ProtectedRoute"

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/clients" replace /> },
  { path: "/auth/login", element: <LoginPage /> },
  {
    path: "/clients",
    element: (
      <ProtectedRoute>
        <ClientsListPage />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
