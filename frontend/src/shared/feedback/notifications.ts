import { toast } from "sonner"

import i18n from "@/shared/i18n/config"

export function notifySuccess(messageKey: string): string | number {
  return toast.success(i18n.t(messageKey))
}
