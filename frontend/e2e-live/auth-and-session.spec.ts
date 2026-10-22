/**
 * Живой сценарий аутентификации и сессии против настоящего стенда:
 * браузер → Go API → Java auth.
 */
import { expect, test } from "@playwright/test"

import { ensureUser, liveRunData } from "./helpers"

test("S1: регистрация и вход через форму против настоящего Java-сервиса", async ({
  page,
}) => {
  const data = liveRunData()

  await page.goto("/auth/register")
  await page.getByLabel("Name", { exact: true }).fill(data.name)
  await page.getByLabel("Surname", { exact: true }).fill(data.surname)
  await page.getByLabel("Email", { exact: true }).fill(data.uiEmail)
  await page.getByLabel("Phone", { exact: true }).fill(data.phone)
  await page.getByLabel("Password", { exact: true }).fill(data.password)
  await page.getByRole("button", { name: "Sign Up", exact: true }).click()

  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole("table")).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeTruthy()
})

test("S2: раздел открывается по факту наличия токена, а 401 сервера завершает сессию", async ({
  page,
}) => {
  await page.goto("/auth/login")
  await page.evaluate(() =>
    localStorage.setItem("auth_token", "opaque-invalid-token"),
  )

  // ответ списка задерживаем, чтобы успеть увидеть открытый раздел до 401
  await page.route("**/api/v1/products", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

  await page.goto("/products")
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible()

  await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 15000 })
  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeNull()
})

test("S3: панель не запрашивает профиль и права, а защищённые запросы несут токен", async ({
  page,
  request,
}) => {
  const data = liveRunData()
  const token = await ensureUser(request, data, data.email)

  const observed: { url: string; authorization: string | null }[] = []
  page.on("request", (entry) => {
    observed.push({
      url: entry.url(),
      authorization: entry.headers()["authorization"] ?? null,
    })
  })

  await page.goto("/auth/login")
  await page.evaluate(
    (value) => localStorage.setItem("auth_token", value),
    token,
  )
  await page.goto("/clients")
  await expect(page.getByRole("table")).toBeVisible()

  const apiRequests = observed.filter((entry) => entry.url.includes("/api/v1/"))
  expect(apiRequests.length).toBeGreaterThan(0)

  for (const entry of apiRequests) {
    const path = new URL(entry.url).pathname
    expect(path).not.toMatch(/\/(me|profile|roles|permissions|rights)\b/i)
    expect(entry.authorization).toBe(`Bearer ${token}`)
  }
})
