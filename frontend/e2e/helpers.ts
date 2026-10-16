import type { Page } from "@playwright/test"

export const MOCK_TOKEN = "mock-access-token"

export const MOCK_CLIENTS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Ivan",
    surname: "Ivanov",
    birthday: "1986-09-12",
    gender: "m",
    registration_date: "2026-09-12T12:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Anna",
    surname: "Petrova",
    birthday: "1990-01-05",
    gender: "f",
    registration_date: "2024-01-03T09:30:00Z",
  },
]

export async function mockApi(page: Page): Promise<void> {
  await page.route(/\/api\/v1\/auth$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: MOCK_TOKEN }),
    }),
  )

  await page.route(/\/api\/v1\/clients$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CLIENTS),
    }),
  )
}

export async function login(page: Page): Promise<void> {
  await page.goto("/auth/login")
  await page.getByLabel("Email").fill("admin@example.com")
  await page.getByLabel("Password").fill("secret")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL(/\/clients$/)
}
