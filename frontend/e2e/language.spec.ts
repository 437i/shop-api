import { expect, test } from "@playwright/test"

import { login, mockApi } from "./helpers"

test("should switch language between English and Russian", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await expect(
    page.getByRole("link", { name: "Clients", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Name", exact: true }),
  ).toBeVisible()

  await page.getByRole("button", { name: "EN", exact: true }).click()

  await expect(
    page.getByRole("button", { name: "RU", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Клиенты", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Имя", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Дата регистрации", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Выйти", exact: true }),
  ).toBeVisible()

  await page.getByRole("button", { name: "RU", exact: true }).click()

  await expect(
    page.getByRole("button", { name: "EN", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Clients", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Name", exact: true }),
  ).toBeVisible()
})
