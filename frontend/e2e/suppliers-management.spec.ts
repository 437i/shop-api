import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_SUPPLIERS } from "./helpers"

const NEW_SUPPLIER = {
  name: "ООО Ромашка",
  phone: "+7 (999) 123-45-67",
  country: "Belarus",
  city: "Minsk",
  street: "Nezavisimosti 1",
}

const EXISTING_SUPPLIER = MOCK_SUPPLIERS[0]!

async function openEditAddressDialog(page: Page): Promise<Locator> {
  await page
    .getByRole("button", {
      name: `Actions for ${EXISTING_SUPPLIER.name}`,
      exact: true,
    })
    .click()
  await page
    .getByRole("menuitem", { name: "Edit address", exact: true })
    .click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

async function openDeleteDialog(page: Page): Promise<Locator> {
  await page
    .getByRole("button", {
      name: `Actions for ${EXISTING_SUPPLIER.name}`,
      exact: true,
    })
    .click()
  await page
    .getByRole("menuitem", {
      name: `Delete supplier ${EXISTING_SUPPLIER.name}`,
      exact: true,
    })
    .click()

  const dialog = page.getByRole("alertdialog")

  await expect(dialog).toBeVisible()

  return dialog
}

async function openCreateDialog(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add supplier", exact: true }).click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

async function fillCreateForm(page: Page, dialog: Locator): Promise<void> {
  await dialog.getByLabel("Name", { exact: true }).fill(NEW_SUPPLIER.name)
  await dialog.getByLabel("Phone", { exact: true }).fill(NEW_SUPPLIER.phone)
  await dialog.getByLabel("Country", { exact: true }).fill(NEW_SUPPLIER.country)
  await dialog.getByLabel("City", { exact: true }).fill(NEW_SUPPLIER.city)
  await dialog.getByLabel("Street", { exact: true }).fill(NEW_SUPPLIER.street)
}

test("should open /suppliers via the menu item with the active state", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  const suppliersLink = page.getByRole("link", {
    name: "Suppliers",
    exact: true,
  })
  await suppliersLink.click()

  await expect(page).toHaveURL(/\/suppliers$/)
  await expect(
    page.getByRole("heading", { name: "Suppliers", exact: true }),
  ).toBeVisible()
  expect(await suppliersLink.getAttribute("data-active")).not.toBeNull()
  await expect(
    page.getByRole("cell", { name: "ООО Моя Оборона", exact: true }),
  ).toBeVisible()
})

test("should create a supplier and show it in the refreshed list", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Suppliers", exact: true }).click()
  await expect(page).toHaveURL(/\/suppliers$/)

  const dialog = await openCreateDialog(page)
  await fillCreateForm(page, dialog)
  await dialog.getByRole("button", { name: "Create", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole("cell", { name: NEW_SUPPLIER.name, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: NEW_SUPPLIER.phone, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: NEW_SUPPLIER.country, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("cell", { name: NEW_SUPPLIER.city, exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(NEW_SUPPLIER.street, { exact: true }),
  ).toBeVisible()
})

test("should delete a supplier only after confirmation", async ({ page }) => {
  const mock = await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Suppliers", exact: true }).click()
  await expect(page).toHaveURL(/\/suppliers$/)

  const row = page.getByRole("cell", {
    name: EXISTING_SUPPLIER.name,
    exact: true,
  })
  await expect(row).toBeVisible()

  const cancelledDialog = await openDeleteDialog(page)
  await expect(
    cancelledDialog.getByText(
      `Are you sure you want to delete ${EXISTING_SUPPLIER.name}? This action cannot be undone.`,
    ),
  ).toBeVisible()
  await cancelledDialog.getByRole("button", { name: "Cancel" }).click()

  await expect(cancelledDialog).toBeHidden()
  expect(mock.deleteSupplierRequests).toEqual([])
  await expect(row).toBeVisible()

  const confirmedDialog = await openDeleteDialog(page)
  await confirmedDialog.getByRole("button", { name: "Delete" }).click()

  await expect(confirmedDialog).toBeHidden()
  await expect(row).toBeHidden()
  expect(mock.deleteSupplierRequests).toEqual([EXISTING_SUPPLIER.id])
})

test("should keep the supplier and show the in-use error when deletion fails", async ({
  page,
}) => {
  const mock = await mockApi(page, {
    deleteSupplierError: {
      status: 400,
      message: "supplier is used by products",
    },
  })
  await login(page)

  await page.getByRole("link", { name: "Suppliers", exact: true }).click()
  await expect(page).toHaveURL(/\/suppliers$/)

  const dialog = await openDeleteDialog(page)
  await dialog.getByRole("button", { name: "Delete" }).click()

  await expect(dialog.getByRole("alert")).toHaveText(
    "supplier is used by products",
  )
  await expect(dialog).toBeVisible()
  await expect(
    page.getByRole("cell", {
      name: EXISTING_SUPPLIER.name,
      exact: true,
      includeHidden: true,
    }),
  ).toBeVisible()
  expect(mock.deleteSupplierRequests).toEqual([EXISTING_SUPPLIER.id])
})

test("should prefill the address, save it and show the updated values when reopened", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Suppliers", exact: true }).click()
  await expect(page).toHaveURL(/\/suppliers$/)

  const dialog = await openEditAddressDialog(page)
  await expect(dialog.getByLabel("Country", { exact: true })).toHaveValue(
    "Russia",
  )
  await expect(dialog.getByLabel("City", { exact: true })).toHaveValue(
    "Moscow",
  )
  await expect(dialog.getByLabel("Street", { exact: true })).toHaveValue(
    "Tverskaya 1",
  )

  await dialog.getByLabel("Street", { exact: true }).fill("Novy Arbat 5")
  await dialog.getByRole("button", { name: "Save", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(
    page.getByText("Novy Arbat 5", { exact: true }),
  ).toBeVisible()

  const reopened = await openEditAddressDialog(page)
  await expect(reopened.getByLabel("Street", { exact: true })).toHaveValue(
    "Novy Arbat 5",
  )
})
