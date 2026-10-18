import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_PRODUCTS, MOCK_SUPPLIERS } from "./helpers"

const NEW_PRODUCT = {
  name: "Siemens KG39N",
  category: "Refrigerators",
  price: "1299.00",
  stock: "4",
}

const SELECTED_SUPPLIER = MOCK_SUPPLIERS[0]!

const EXISTING_PRODUCT = MOCK_PRODUCTS[0]!

function productRow(page: Page, name: string): Locator {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  })
}

async function openRowAction(
  page: Page,
  productName: string,
  actionName: string,
): Promise<void> {
  await productRow(page, productName)
    .getByRole("button", { name: `Actions for ${productName}`, exact: true })
    .click()
  await page.getByRole("menuitem", { name: actionName, exact: true }).click()
}

async function openCreateDialog(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Add product", exact: true }).click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

test("should create a product with a supplier and show it in the refreshed list", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  const dialog = await openCreateDialog(page)

  await dialog.getByLabel("Name", { exact: true }).fill(NEW_PRODUCT.name)
  await dialog
    .getByLabel("Category", { exact: true })
    .fill(NEW_PRODUCT.category)
  await dialog.getByLabel("Price", { exact: true }).fill(NEW_PRODUCT.price)
  await dialog
    .getByLabel("Available Stock", { exact: true })
    .fill(NEW_PRODUCT.stock)
  await dialog.getByLabel("Supplier", { exact: true }).click()
  await page
    .getByRole("option", { name: SELECTED_SUPPLIER.name, exact: true })
    .click()

  await dialog.getByRole("button", { name: "Create", exact: true }).click()

  await expect(dialog).toBeHidden()

  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: NEW_PRODUCT.name, exact: true }),
  })

  await expect(row).toHaveCount(1)
  await expect(
    row.getByRole("cell", { name: NEW_PRODUCT.category, exact: true }),
  ).toBeVisible()
  await expect(
    row.getByRole("cell", { name: NEW_PRODUCT.price, exact: true }),
  ).toBeVisible()
  await expect(row.getByText(NEW_PRODUCT.stock, { exact: true })).toBeVisible()
})

test("should not send a delete request when the confirmation is cancelled", async ({
  page,
}) => {
  const handle = await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await openRowAction(
    page,
    EXISTING_PRODUCT.name,
    `Delete product ${EXISTING_PRODUCT.name}`,
  )

  const dialog = page.getByRole("alertdialog")

  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText(EXISTING_PRODUCT.name, { exact: false }),
  ).toBeVisible()

  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()

  await expect(dialog).toBeHidden()
  expect(handle.deleteProductRequests).toEqual([])
  await expect(productRow(page, EXISTING_PRODUCT.name)).toHaveCount(1)
})

test("should delete the product only after confirmation and remove the row", async ({
  page,
}) => {
  const handle = await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await openRowAction(
    page,
    EXISTING_PRODUCT.name,
    `Delete product ${EXISTING_PRODUCT.name}`,
  )

  const dialog = page.getByRole("alertdialog")

  await dialog.getByRole("button", { name: "Delete", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(productRow(page, EXISTING_PRODUCT.name)).toHaveCount(0)
  expect(handle.deleteProductRequests).toEqual([EXISTING_PRODUCT.id])
})

test("should decrease the stock and update the value in the row", async ({
  page,
}) => {
  const handle = await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await openRowAction(page, EXISTING_PRODUCT.name, "Decrease stock")

  const dialog = page.getByRole("dialog")

  await dialog.getByLabel("Amount", { exact: true }).fill("2")
  await dialog.getByRole("button", { name: "Decrease", exact: true }).click()

  await expect(dialog).toBeHidden()

  const row = productRow(page, EXISTING_PRODUCT.name)

  await expect(row.getByText("3", { exact: true })).toBeVisible()
  expect(handle.decreaseStockRequests).toEqual([
    { id: EXISTING_PRODUCT.id, amount: 2 },
  ])
})

test("should warn and remove the row when the stock is decreased to zero", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await openRowAction(page, EXISTING_PRODUCT.name, "Decrease stock")

  const dialog = page.getByRole("dialog")

  await dialog
    .getByLabel("Amount", { exact: true })
    .fill(String(EXISTING_PRODUCT.available_stock))
  await expect(
    dialog.getByText("The stock will become 0", { exact: false }),
  ).toBeVisible()

  await dialog.getByRole("button", { name: "Decrease", exact: true }).click()

  await expect(dialog).toBeHidden()
  await expect(productRow(page, EXISTING_PRODUCT.name)).toHaveCount(0)
})

test("should show the 409 error inside the stock dialog", async ({ page }) => {
  await mockApi(page, {
    decreaseStockError: { status: 409, message: "insufficient stock" },
  })
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await openRowAction(page, EXISTING_PRODUCT.name, "Decrease stock")

  const dialog = page.getByRole("dialog")

  await dialog.getByLabel("Amount", { exact: true }).fill("2")
  await dialog.getByRole("button", { name: "Decrease", exact: true }).click()

  await expect(dialog.getByRole("alert")).toHaveText("insufficient stock")
  await expect(dialog).toBeVisible()
})
