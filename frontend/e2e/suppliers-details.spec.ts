import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_SUPPLIERS } from "./helpers"

const EXISTING_SUPPLIER = MOCK_SUPPLIERS[0]!
const MISSING_SUPPLIER_ID = "33333333-3333-3333-3333-333330000000"

function supplierRow(page: Page, name: string): Locator {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  })
}

async function openSuppliersList(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Suppliers", exact: true }).click()
  await expect(page).toHaveURL(/\/suppliers$/)
}

test("should open the supplier card from the row menu, show its fields and return to the list", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)
  await openSuppliersList(page)

  await supplierRow(page, EXISTING_SUPPLIER.name)
    .getByRole("button", {
      name: `Actions for ${EXISTING_SUPPLIER.name}`,
      exact: true,
    })
    .click()
  await page.getByRole("menuitem", { name: "Details", exact: true }).click()

  await expect(page).toHaveURL(
    new RegExp(`/suppliers/${EXISTING_SUPPLIER.id}$`),
  )
  await expect(
    page.getByText(EXISTING_SUPPLIER.name, { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText("Name", { exact: true })).toBeVisible()
  await expect(page.getByText("Phone", { exact: true })).toBeVisible()
  await expect(
    page.getByText(EXISTING_SUPPLIER.phone_number, { exact: true }),
  ).toBeVisible()

  await expect(page.getByText("Address", { exact: true })).toBeVisible()
  await expect(
    page.getByText(EXISTING_SUPPLIER.address.country!, { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(EXISTING_SUPPLIER.address.city!, { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(EXISTING_SUPPLIER.address.street!, { exact: true }),
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Back to suppliers", exact: true })
    .click()

  await expect(page).toHaveURL(/\/suppliers$/)
  await expect(supplierRow(page, EXISTING_SUPPLIER.name)).toHaveCount(1)
})

test("should show the not-found state for a missing supplier by direct URL", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.goto(`/suppliers/${MISSING_SUPPLIER_ID}`)

  await expect(page).toHaveURL(
    new RegExp(`/suppliers/${MISSING_SUPPLIER_ID}$`),
  )
  await expect(
    page.getByRole("heading", {
      name: "Supplier not found",
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(
    page.getByText("Supplier not found", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Back to suppliers", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(EXISTING_SUPPLIER.name, { exact: true }),
  ).toHaveCount(0)
})
