import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_CLIENTS } from "./helpers"

const IVAN_FULL_NAME = "Ivan Ivanov"

const NEW_CLIENT = {
  name: "Petr",
  surname: "Sidorov",
  birthday: "2000-05-05",
  gender: "n/a",
  genderLabel: "N/A",
  country: "Russia",
  city: "Moscow",
  street: "Tverskaya 1",
}

async function openCreateDialog(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add client", exact: true }).click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

async function fillCreateForm(page: Page, dialog: Locator): Promise<void> {
  await dialog.getByLabel("Name", { exact: true }).fill(NEW_CLIENT.name)
  await dialog.getByLabel("Surname", { exact: true }).fill(NEW_CLIENT.surname)
  await dialog.getByLabel("Birthday", { exact: true }).fill(NEW_CLIENT.birthday)
  await dialog.getByLabel("Gender", { exact: true }).click()
  await page
    .getByRole("option", { name: NEW_CLIENT.genderLabel, exact: true })
    .click()
  await dialog.getByLabel("Country", { exact: true }).fill(NEW_CLIENT.country)
  await dialog.getByLabel("City", { exact: true }).fill(NEW_CLIENT.city)
  await dialog.getByLabel("Street", { exact: true }).fill(NEW_CLIENT.street)
}

async function openEditAddressDialog(page: Page): Promise<Locator> {
  await page
    .getByRole("button", { name: `Actions for ${IVAN_FULL_NAME}`, exact: true })
    .click()
  await page.getByRole("menuitem", { name: "Edit address", exact: true }).click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

test("should create a client and show it in the refreshed list", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  const dialog = await openCreateDialog(page)
  await fillCreateForm(page, dialog)
  await dialog.getByRole("button", { name: "Create", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole("cell", { name: NEW_CLIENT.name, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: NEW_CLIENT.surname, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: NEW_CLIENT.birthday, exact: true }),
  ).toBeVisible()
})

test("should keep the dialog open with entered values when creation fails with 400", async ({
  page,
}) => {
  const serverMessage = "client can't be younger than 16 years"
  await mockApi(page, { createError: { status: 400, message: serverMessage } })
  await login(page)

  const dialog = await openCreateDialog(page)
  await fillCreateForm(page, dialog)
  await dialog.getByRole("button", { name: "Create", exact: true }).click()

  await expect(dialog.getByRole("alert")).toHaveText(serverMessage)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    NEW_CLIENT.name,
  )
  await expect(dialog.getByLabel("Surname", { exact: true })).toHaveValue(
    NEW_CLIENT.surname,
  )
  await expect(dialog.getByLabel("Birthday", { exact: true })).toHaveValue(
    NEW_CLIENT.birthday,
  )
  await expect(dialog.getByLabel("Gender", { exact: true })).toHaveText(
    NEW_CLIENT.gender,
  )
  await expect(dialog.getByLabel("Country", { exact: true })).toHaveValue(
    NEW_CLIENT.country,
  )
  await expect(dialog.getByLabel("City", { exact: true })).toHaveValue(
    NEW_CLIENT.city,
  )
  await expect(dialog.getByLabel("Street", { exact: true })).toHaveValue(
    NEW_CLIENT.street,
  )
})

test("should delete a client only after confirmation", async ({ page }) => {
  const mock = await mockApi(page)
  await login(page)

  await page
    .getByRole("button", { name: `Actions for ${IVAN_FULL_NAME}`, exact: true })
    .click()
  await page
    .getByRole("menuitem", {
      name: `Delete client ${IVAN_FULL_NAME}`,
      exact: true,
    })
    .click()

  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toBeVisible()
  await expect(confirmation).toContainText(IVAN_FULL_NAME)

  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click()
  await expect(confirmation).toBeHidden()
  expect(mock.deleteRequests).toHaveLength(0)
  await expect(
    page.getByRole("cell", { name: "Ivanov", exact: true }),
  ).toBeVisible()

  await page
    .getByRole("button", { name: `Actions for ${IVAN_FULL_NAME}`, exact: true })
    .click()
  await page
    .getByRole("menuitem", {
      name: `Delete client ${IVAN_FULL_NAME}`,
      exact: true,
    })
    .click()
  await expect(confirmation).toBeVisible()

  await confirmation
    .getByRole("button", { name: "Delete", exact: true })
    .click()

  await expect(confirmation).toBeHidden()
  await expect(
    page.getByRole("cell", { name: "Ivanov", exact: true }),
  ).toHaveCount(0)
  expect(mock.deleteRequests).toEqual([MOCK_CLIENTS[0]?.id])
})

test("should prefill the address form and show updated values after saving", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  const dialog = await openEditAddressDialog(page)
  await expect(dialog.getByLabel("Country", { exact: true })).toHaveValue(
    "Russia",
  )
  await expect(dialog.getByLabel("City", { exact: true })).toHaveValue("Moscow")
  await expect(dialog.getByLabel("Street", { exact: true })).toHaveValue(
    "Tverskaya 1",
  )

  await dialog.getByLabel("City", { exact: true }).fill("Saint Petersburg")
  await dialog.getByLabel("Street", { exact: true }).fill("Nevsky 2")

  const refetched = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname.endsWith("/api/v1/clients"),
  )
  await dialog.getByRole("button", { name: "Save", exact: true }).click()

  await expect(dialog).toBeHidden()
  await refetched

  await openEditAddressDialog(page)
  await expect(dialog.getByLabel("Country", { exact: true })).toHaveValue(
    "Russia",
  )
  await expect(dialog.getByLabel("City", { exact: true })).toHaveValue(
    "Saint Petersburg",
  )
  await expect(dialog.getByLabel("Street", { exact: true })).toHaveValue(
    "Nevsky 2",
  )
})
