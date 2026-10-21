import { expect, test } from "@playwright/test"

import { login, mockApi, MOCK_PRODUCTS } from "./helpers"

test("should open /products via the menu item with the active state", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  const productsLink = page.getByRole("link", {
    name: "Products",
    exact: true,
  })
  await productsLink.click()

  await expect(page).toHaveURL(/\/products$/)
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible()
  expect(await productsLink.getAttribute("data-active")).not.toBeNull()
})

test("should show the product list with the column values", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await expect(
    page.getByRole("columnheader", { name: "Name", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Category", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Price", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("columnheader", { name: "Available Stock", exact: true }),
  ).toBeVisible()

  for (const product of MOCK_PRODUCTS) {
    const row = page.getByRole("row").filter({
      has: page.getByRole("cell", { name: product.name, exact: true }),
    })

    await expect(row).toHaveCount(1)
    await expect(
      row.getByRole("cell", { name: product.category?.name, exact: true }),
    ).toBeVisible()
    await expect(
      row.getByRole("cell", { name: product.price, exact: true }),
    ).toBeVisible()
    await expect(
      row.getByText(String(product.available_stock), { exact: true }),
    ).toBeVisible()
  }
})

test("should show the empty state when there are no products in stock", async ({
  page,
}) => {
  await mockApi(page, { productsList: [] })
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await expect(
    page.getByText("No products in stock", { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("table")).toBeHidden()
})

test("should show an alert and no table when the products request fails", async ({
  page,
}) => {
  await mockApi(page, {
    productsListError: { status: 500, message: "database is down" },
  })
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await expect(page.getByRole("alert")).toContainText("database is down")
  await expect(page.getByRole("table")).toBeHidden()
})

test("should redirect to login when accessing /products after logout", async ({
  page,
}) => {
  await mockApi(page)
  await login(page)

  await page.getByRole("link", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)

  await page.getByRole("button", { name: "Logout", exact: true }).click()
  await expect(page).toHaveURL(/\/auth\/login$/)

  await page.goto("/products")

  await expect(page).toHaveURL(/\/auth\/login$/)
  await expect(
    page.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible()
})
