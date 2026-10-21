import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"

import { Toaster } from "@/components/ui/sonner"
import { setUnauthorizedHandler } from "@/shared/api/client"
import i18n from "@/shared/i18n/config"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
})

setUnauthorizedHandler(() => {
  queryClient.clear()
  window.location.assign("/auth/login")
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {children}
        <Toaster />
      </I18nextProvider>
    </QueryClientProvider>
  )
}
