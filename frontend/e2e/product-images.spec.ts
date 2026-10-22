import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { login, mockApi, MOCK_PRODUCTS } from "./helpers"

const EXISTING_PRODUCT = MOCK_PRODUCTS[0]!

const PHOTO = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: Buffer.from("photo-bytes"),
}

const REPLACEMENT_PHOTO = {
  name: "replacement.png",
  mimeType: "image/png",
  buffer: Buffer.from("replacement-photo-bytes"),
}

function productRow(page: Page, name: string): Locator {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name, exact: true }),
  })
}

async function openPhotoDialog(page: Page): Promise<Locator> {
  await productRow(page, EXISTING_PRODUCT.name)
    .getByRole("button", {
      name: `Actions for ${EXISTING_PRODUCT.name}`,
      exact: true,
    })
    .click()
  await page
    .getByRole("menuitem", {
      name: `Manage the photo of ${EXISTING_PRODUCT.name}`,
      exact: true,
    })
    .click()

  const dialog = page.getByRole("dialog")

  await expect(dialog).toBeVisible()

  return dialog
}

test("should upload, replace and delete a product photo", async ({ page }) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  const dialog = await openPhotoDialog(page)

  await expect(dialog.getByText("The product has no photo")).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Replace photo", exact: true }),
  ).toHaveCount(0)

  await dialog.getByLabel("Image file").setInputFiles(PHOTO)
  await dialog.getByRole("button", { name: "Upload photo", exact: true }).click()

  await expect(
    dialog.getByRole("img", {
      name: `Photo of the product ${EXISTING_PRODUCT.name}`,
    }),
  ).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Replace photo", exact: true }),
  ).toBeEnabled()
  await expect(
    dialog.getByRole("button", { name: "Delete photo", exact: true }),
  ).toBeEnabled()

  await dialog.getByLabel("Image file").setInputFiles(REPLACEMENT_PHOTO)
  await dialog
    .getByRole("button", { name: "Replace photo", exact: true })
    .click()

  await expect(
    dialog.getByRole("img", {
      name: `Photo of the product ${EXISTING_PRODUCT.name}`,
    }),
  ).toBeVisible()

  await dialog.getByRole("button", { name: "Delete photo", exact: true }).click()

  const confirmButton = page.getByRole("button", {
    name: `Delete the photo of ${EXISTING_PRODUCT.name}`,
    exact: true,
  })

  await expect(confirmButton).toBeVisible()
  await confirmButton.click()

  await expect(dialog.getByText("The product has no photo")).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Replace photo", exact: true }),
  ).toHaveCount(0)
})
