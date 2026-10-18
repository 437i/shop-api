import type { RouteObject } from "react-router"
import { Navigate, Outlet, createBrowserRouter } from "react-router"

import { NotFoundPage } from "@/pages/NotFoundPage"
import { LoginPage } from "@/pages/auth/LoginPage"
import { ClientsListPage } from "@/pages/clients/ClientsListPage"
import { SuppliersListPage } from "@/pages/suppliers/SuppliersListPage"

import { AdminLayout } from "./AdminLayout"
import { ProtectedRoute } from "./ProtectedRoute"

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/clients" replace /> },
  { path: "/auth/login", element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <AdminLayout>
          <Outlet />
        </AdminLayout>
      </ProtectedRoute>
    ),
    children: [
      { path: "/clients", element: <ClientsListPage /> },
      { path: "/suppliers", element: <SuppliersListPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
