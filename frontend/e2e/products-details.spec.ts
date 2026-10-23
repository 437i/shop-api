import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_PRODUCTS } from "./helpers"

const EXISTING_PRODUCT = MOCK_PRODUCTS[0]!
const MISSING_PRODUCT_ID = "44444444-4444-4444-4444-444400000000"

const PHOTO = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: Buffer.from("photo-bytes"),
}

function productRow(page: Page, name: string): Locator {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  })
}

async function openProductsList(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)
}

test("should open the product card from the row menu, show its fields and return to the list", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)
  await openProductsList(page)

  await productRow(page, EXISTING_PRODUCT.name)
    .getByRole("button", {
      name: `Actions for ${EXISTING_PRODUCT.name}`,
      exact: true,
    })
    .click()
  await page.getByRole("menuitem", { name: "Details", exact: true }).click()

  await expect(page).toHaveURL(
    new RegExp(`/products/${EXISTING_PRODUCT.id}$`),
  )
  await expect(
    page.getByText(EXISTING_PRODUCT.name, { exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Refrigerators", { exact: true })).toBeVisible()
  await expect(page.getByText("999.99", { exact: true })).toBeVisible()
  await expect(page.getByText("5", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Last Update", { exact: true }),
  ).toBeVisible()

  await expect(page.getByText("Supplier", { exact: true })).toBeVisible()
  await expect(
    page.getByText("ООО Моя Оборона", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText("+79991234567", { exact: true }),
  ).toBeVisible()
  await expect(page.getByText("Russia", { exact: true })).toBeVisible()
  await expect(page.getByText("Moscow", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Tverskaya 1", { exact: true }),
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Back to products", exact: true })
    .click()

  await expect(page).toHaveURL(/\/products$/)
  await expect(productRow(page, EXISTING_PRODUCT.name)).toHaveCount(1)
})

test("should show the not-found state for a missing product by direct URL", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.goto(`/products/${MISSING_PRODUCT_ID}`)

  await expect(page).toHaveURL(
    new RegExp(`/products/${MISSING_PRODUCT_ID}$`),
  )
  await expect(
    page.getByRole("heading", {
      name: "Product not found",
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(
    page.getByText("Product not found", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Back to products", exact: true }),
  ).toBeVisible()
})

test("should open the photo dialog from the card and load the photo", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)
  await openProductsList(page)

  const row = productRow(page, EXISTING_PRODUCT.name)
  await row
    .getByRole("button", {
      name: `Actions for ${EXISTING_PRODUCT.name}`,
      exact: true,
    })
    .click()
  await page.getByRole("menuitem", { name: "Details", exact: true }).click()

  await expect(
    page.getByRole("button", {
      name: `Manage the photo of ${EXISTING_PRODUCT.name}`,
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole("button", {
      name: `Manage the photo of ${EXISTING_PRODUCT.name}`,
      exact: true,
    })
    .click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText("The product has no photo", { exact: true }),
  ).toBeVisible()

  await dialog.getByLabel("Image file").setInputFiles(PHOTO)
  await dialog
    .getByRole("button", { name: "Upload photo", exact: true })
    .click()

  await expect(
    dialog.getByRole("img", {
      name: `Photo of the product ${EXISTING_PRODUCT.name}`,
    }),
  ).toBeVisible()
})
