import { HugeiconsIcon } from "@hugeicons/react"
import {
  DeliveryTruck01Icon,
  LanguageCircleIcon,
  Logout01Icon,
  PackageIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { clearAuthToken } from "@/shared/api/client"

export function AdminLayout({ children }: { children?: ReactNode }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isClientsActive = location.pathname === "/clients"
  const isProductsActive = location.pathname === "/products"
  const isSuppliersActive = location.pathname === "/suppliers"

  const language = i18n.resolvedLanguage === "ru" ? "ru" : "en"

  const handleLanguageToggle = () => {
    void i18n.changeLanguage(language === "en" ? "ru" : "en")
  }

  const handleLogout = () => {
    clearAuthToken()
    queryClient.clear()
    navigate("/auth/login", { replace: true })
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isClientsActive}
                    render={<Link to="/clients" />}
                  >
                    <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                    <span>{t("navigation.clients")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isProductsActive}
                    render={<Link to="/products" />}
                  >
                    <HugeiconsIcon icon={PackageIcon} strokeWidth={2} />
                    <span>{t("navigation.products")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isSuppliersActive}
                    render={<Link to="/suppliers" />}
                  >
                    <HugeiconsIcon icon={DeliveryTruck01Icon} strokeWidth={2} />
                    <span>{t("navigation.suppliers")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                aria-label={`${t("navigation.switchLanguage")}: ${language.toUpperCase()}`}
                onClick={handleLanguageToggle}
              >
                <HugeiconsIcon icon={LanguageCircleIcon} strokeWidth={2} />
                <span>{language.toUpperCase()}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                <span>{t("navigation.logout")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
