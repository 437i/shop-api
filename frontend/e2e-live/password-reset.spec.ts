/**
 * Живой сценарий сброса пароля: почтовой инфраструктуры в стенде нет, поэтому
 * проверяется поддерживаемая стендом часть — 204, новый пароль в логах сервиса
 * `auth` и вход с ним.
 */
import { expect, test } from "@playwright/test"

import { API, ensureUser, liveRunData, readAuthLog, readResetPassword } from "./helpers"

test("S5: сброс пароля возвращает 204, новый пароль попадает в логи и подходит для входа", async ({
  page,
  request,
}) => {
  const data = liveRunData()
  await ensureUser(request, data, data.resetEmail)

  // фиксируем объём лога до запроса: записи прошлых прогонов игнорируются
  const logOffset = readAuthLog().length

  const response = await request.post(API.reset, {
    data: { email: data.resetEmail },
  })
  expect(response.status()).toBe(204)

  const newPassword = readResetPassword(data.resetEmail, logOffset)
  expect(newPassword).toBeTruthy()

  await page.goto("/auth/login")
  await page.getByLabel("Email", { exact: true }).fill(data.resetEmail)
  await page.getByLabel("Password", { exact: true }).fill(newPassword ?? "")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()

  await expect(page).toHaveURL(/\/clients$/)
})
