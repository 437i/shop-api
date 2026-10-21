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
    page.getByRole("link", { name: "Products", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Products", exact: true }),
  ).toHaveAttribute("href", "/products")
  await expect(
    page.getByRole("link", { name: "Suppliers", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Suppliers", exact: true }),
  ).toHaveAttribute("href", "/suppliers")

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

test("should open the registration page from the login page", async ({ page }) => {
  await mockApi(page)

  await page.goto("/auth/login")
  await page.getByRole("link", { name: "Sign up", exact: true }).click()

  await expect(page).toHaveURL(/\/auth\/register$/)
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible()
})

test("should open the password reset page from the login page", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/login")
  await page
    .getByRole("link", { name: "Forgot your password?", exact: true })
    .click()

  await expect(page).toHaveURL(/\/auth\/reset$/)
  await expect(page.getByLabel("Email")).toBeVisible()
})

test("should return to the login page from the registration page", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/register")
  await page.getByRole("link", { name: "Back to sign in", exact: true }).click()

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()
})

test("should return to the login page from the password reset page", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/reset")
  await page.getByRole("link", { name: "Back to sign in", exact: true }).click()

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()
})

test("should register a new user with the mocked api and open the clients section", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/register")
  await page.getByLabel("Name", { exact: true }).fill("Pavel")
  await page.getByLabel("Surname", { exact: true }).fill("Petrov")
  await page.getByLabel("Email", { exact: true }).fill("pavel@example.com")
  await page.getByLabel("Phone", { exact: true }).fill("+7-999-123-45-67")
  await page.getByLabel("Password", { exact: true }).fill("secret")
  await page.getByRole("button", { name: "Sign Up", exact: true }).click()

  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole("table")).toBeVisible()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBe(MOCK_TOKEN)
})

test("should show the conflict message when the email is already taken", async ({
  page,
}) => {
  await mockApi(page)
  // The occupied email is checked by intercepting the route with a 409
  // response, because the mocked api accepts any credentials.
  await page.route(/\/api\/v1\/register$/, (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ message: "user already exists" }),
    }),
  )

  await page.goto("/auth/register")
  await page.getByLabel("Name", { exact: true }).fill("Pavel")
  await page.getByLabel("Surname", { exact: true }).fill("Petrov")
  await page.getByLabel("Email", { exact: true }).fill("pavel@example.com")
  await page.getByLabel("Phone", { exact: true }).fill("+7-999-123-45-67")
  await page.getByLabel("Password", { exact: true }).fill("secret")
  await page.getByRole("button", { name: "Sign Up", exact: true }).click()

  await expect(page.getByText("user already exists")).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/register$/)

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBeNull()
})

test("should reset the password with the mocked api and show the log message", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/reset")
  await page.getByLabel("Email", { exact: true }).fill("admin@example.com")
  await page.getByRole("button", { name: "Reset password", exact: true }).click()

  await expect(
    page.getByText(
      "The password has been reset. The new password is written to the authentication service log.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      "The current password no longer works. Sign in with the new password from the log.",
    ),
  ).toBeVisible()
})

test("should keep the link to the login page after a successful password reset", async ({
  page,
}) => {
  await mockApi(page)

  await page.goto("/auth/reset")
  await page.getByLabel("Email", { exact: true }).fill("admin@example.com")
  // The link was moved out of the form, so the implicit submission by Enter
  // has to keep working.
  await page.getByLabel("Email", { exact: true }).press("Enter")

  await expect(
    page.getByText(
      "The password has been reset. The new password is written to the authentication service log.",
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      "The current password no longer works. Sign in with the new password from the log.",
    ),
  ).toBeVisible()

  await page.getByRole("link", { name: "Back to sign in", exact: true }).click()

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()
})

test("should change the password with the mocked api and keep the session", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("button", { name: "Change password", exact: true }).click()

  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Current password").fill("old-secret")
  await dialog.getByLabel("New password").fill("new-secret")
  await dialog
    .getByRole("button", { name: "Change password", exact: true })
    .click()

  await expect(page.getByText("The password has been changed.")).toBeVisible()
  await expect(dialog).toBeHidden()

  const token = await page.evaluate(() => localStorage.getItem("auth_token"))
  expect(token).toBe(MOCK_TOKEN)
  await expect(page).toHaveURL(/\/clients$/)
})
