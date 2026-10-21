import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

import { MOCK_TOKEN, login, mockApi } from "./helpers"

interface FormLabels {
  addClient: string
  name: string
  surname: string
  birthday: string
  gender: string
  genderOption: string
  country: string
  city: string
  street: string
  submit: string
}

const EN_LABELS: FormLabels = {
  addClient: "Add client",
  name: "Name",
  surname: "Surname",
  birthday: "Birthday",
  gender: "Gender",
  genderOption: "N/A",
  country: "Country",
  city: "City",
  street: "Street",
  submit: "Create",
}

const RU_LABELS: FormLabels = {
  addClient: "Добавить клиента",
  name: "Имя",
  surname: "Фамилия",
  birthday: "Дата рождения",
  gender: "Пол",
  genderOption: "Н/Д",
  country: "Страна",
  city: "Город",
  street: "Улица",
  submit: "Создать",
}

const CLIENT_VALUES = {
  name: "Petr",
  surname: "Sidorov",
  birthday: "2000-05-05",
  country: "Russia",
  city: "Moscow",
  street: "Tverskaya 1",
}

interface ElementBox {
  x: number
  y: number
  width: number
  height: number
}

function boxesOverlap(first: ElementBox, second: ElementBox): boolean {
  return (
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  )
}

async function createClient(page: Page, labels: FormLabels): Promise<void> {
  await page.getByRole("button", { name: labels.addClient, exact: true }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  await dialog.getByLabel(labels.name, { exact: true }).fill(CLIENT_VALUES.name)
  await dialog
    .getByLabel(labels.surname, { exact: true })
    .fill(CLIENT_VALUES.surname)
  await dialog
    .getByLabel(labels.birthday, { exact: true })
    .fill(CLIENT_VALUES.birthday)
  await dialog.getByLabel(labels.gender, { exact: true }).click()
  await page
    .getByRole("option", { name: labels.genderOption, exact: true })
    .click()
  await dialog
    .getByLabel(labels.country, { exact: true })
    .fill(CLIENT_VALUES.country)
  await dialog.getByLabel(labels.city, { exact: true }).fill(CLIENT_VALUES.city)
  await dialog.getByLabel(labels.street, { exact: true }).fill(CLIENT_VALUES.street)

  await dialog.getByRole("button", { name: labels.submit, exact: true }).click()
}

async function expectNoOverlap(page: Page, buttonName: string): Promise<void> {
  const message = page.locator('[data-slot="alert-description"]')
  const button = page.getByRole("button", { name: buttonName, exact: true })

  await expect(message).toBeVisible()
  await expect(button).toBeVisible()

  const messageBox = await message.boundingBox()
  const buttonBox = await button.boundingBox()

  expect(messageBox).not.toBeNull()
  expect(buttonBox).not.toBeNull()

  if (!messageBox || !buttonBox) {
    return
  }

  expect(boxesOverlap(messageBox, buttonBox)).toBe(false)
}

test("should repeat the clients list request when the retry action is activated", async ({
  page,
}) => {
  const mock = await mockApi(page, {
    listErrorOnce: { status: 500, message: "server error" },
  })
  await login(page)

  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible()
  expect(mock.clientsListRequests).toBe(1)

  await page.getByRole("button", { name: "Retry", exact: true }).click()

  await expect(page.getByRole("table")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toHaveCount(0)
  expect(mock.clientsListRequests).toBe(2)
})

test("should keep the error message and the blocked retry action while the repeated request runs", async ({
  page,
}) => {
  await mockApi(page, {
    listErrorOnce: { status: 500, message: "server error" },
    listDelayMs: 1500,
  })
  await login(page)

  const retry = page.getByRole("button", { name: "Retry", exact: true })
  await expect(retry).toBeVisible()
  await expect(page.getByRole("alert")).toBeVisible()

  await retry.click()

  const retrying = page.getByRole("button", { name: "Retrying", exact: true })
  await expect(retrying).toBeVisible()
  await expect(retrying).toBeDisabled()
  await expect(page.getByRole("alert")).toBeVisible()

  await expect(page.getByRole("table")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Retrying", exact: true }),
  ).toHaveCount(0)
  await expect(page.getByRole("alert")).toHaveCount(0)
})

test("should show a success notification after a client is created", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await createClient(page, EN_LABELS)

  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Client created" }),
  ).toBeVisible()
})

test("should show the success notification in the selected interface language", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page
    .getByRole("button", { name: "Switch language: EN", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Переключить язык: RU", exact: true }),
  ).toBeVisible()

  await createClient(page, RU_LABELS)

  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Клиент создан" }),
  ).toBeVisible()
})

test("should not show a notification or the retry action when the session ends with 401", async ({
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
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toHaveCount(0)
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0)
})

test("should not overlap the retry action with the error message in any locale", async ({
  page,
}) => {
  await mockApi(page, {
    listErrorOnce: { status: 500, message: "server error" },
  })
  await login(page)

  await expectNoOverlap(page, "Retry")

  await page
    .getByRole("button", { name: "Switch language: EN", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Переключить язык: RU", exact: true }),
  ).toBeVisible()

  await expectNoOverlap(page, "Повторить")
})
