import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type RetryableErrorAlertProps = {
  message: string
  onRetry: () => void
  isRetrying?: boolean
}

export function RetryableErrorAlert({
  message,
  onRetry,
  isRetrying = false,
}: RetryableErrorAlertProps) {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={isRetrying}
        onClick={onRetry}
      >
        {isRetrying ? t("feedback.retrying") : t("feedback.retry")}
      </Button>
    </Alert>
  )
}
