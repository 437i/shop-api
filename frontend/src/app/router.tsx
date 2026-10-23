import type { RouteObject } from "react-router"
import { Navigate, Outlet, createBrowserRouter } from "react-router"

import { NotFoundPage } from "@/pages/NotFoundPage"
import { LoginPage } from "@/pages/auth/LoginPage"
import { RegisterPage } from "@/pages/auth/RegisterPage"
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage"
import { ClientsListPage } from "@/pages/clients/ClientsListPage"
import { ProductDetailsPage } from "@/pages/products/ProductDetailsPage"
import { ProductsListPage } from "@/pages/products/ProductsListPage"
import { SuppliersListPage } from "@/pages/suppliers/SuppliersListPage"

import { AdminLayout } from "./AdminLayout"
import { ProtectedRoute } from "./ProtectedRoute"

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/clients" replace /> },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/register", element: <RegisterPage /> },
  { path: "/auth/reset", element: <ResetPasswordPage /> },
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
      { path: "/products", element: <ProductsListPage /> },
      { path: "/products/:id", element: <ProductDetailsPage /> },
      { path: "/suppliers", element: <SuppliersListPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]

export const router = createBrowserRouter(routes)
