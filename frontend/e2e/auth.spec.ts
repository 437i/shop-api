import { expect, test } from "@playwright/test"

import { MOCK_TOKEN, login, mockApi } from "./helpers"

test("should login with mocked API and navigate to clients", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/login")
  await page.getByLabel("Email").fill("admin@example.com")
  await page.getByLabel("Password").fill("secret")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()

  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole("table")).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Name", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "Ivan", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "Ivanov", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "1986-09-12", exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("cell", { name: "m", exact: true })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Products", exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Suppliers", exact: true }),
  ).toBeDisabled()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBe(MOCK_TOKEN)
})

test("should redirect to login when accessing protected route without token", async ({
  page,
}) => {
  await page.goto("/clients")

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeNull()
})

test("should logout and redirect to login", async ({ page }) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("button", { name: "Logout", exact: true }).click()

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeNull()
})

test("should reset the session and redirect to login when the clients request returns 401", async ({
  page,
}) => {
  await page.goto("/auth/login")
  await page.evaluate((token) => {
    localStorage.setItem("auth_token", token)
  }, MOCK_TOKEN)
  await page.route(/\/api\/v1\/clients$/, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid or expired token" }),
    }),
  )

  await page.goto("/clients")

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeNull()
})
