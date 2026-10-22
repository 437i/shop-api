/**
 * Живой сценарий сущностей: данные создаются через Go API и должны появиться
 * в списках панели вместе с действиями в строке товара.
 */
import { expect, test } from "@playwright/test"

import {
  API,
  CATEGORY_NAME,
  apiCreate,
  ensureUser,
  liveRunData,
} from "./helpers"

test("S4: созданные через Go API поставщик, товар и клиент появляются в списках панели", async ({
  page,
  request,
}) => {
  const data = liveRunData()
  const token = await ensureUser(request, data, data.email)

  const supplier = await apiCreate(request, token, API.suppliers, {
    name: data.supplierName,
    address: { country: "Россия", city: "Москва", street: "Ленина, 1" },
    phone_number: "+79990000001",
  })

  await apiCreate(request, token, API.products, {
    name: data.productName,
    category: { name: CATEGORY_NAME },
    price: "999.99",
    available_stock: 5,
    supplier_id: supplier.id,
  })

  await apiCreate(request, token, API.clients, {
    name: data.clientName,
    surname: data.clientSurname,
    birthday: "1990-01-01",
    gender: "m",
    address: { country: "Россия", city: "Москва", street: "Ленина, 1" },
  })

  await page.goto("/auth/login")
  await page.evaluate(
    (value) => localStorage.setItem("auth_token", value),
    token,
  )

  await page.goto("/suppliers")
  await expect(
    page.getByRole("cell", { name: data.supplierName, exact: true }),
  ).toBeVisible()

  await page.goto("/products")
  await expect(
    page.getByRole("cell", { name: data.productName, exact: true }),
  ).toBeVisible()

  await page
    .getByRole("button", { name: `Actions for ${data.productName}` })
    .click()
  await expect(
    page.getByRole("menuitem", { name: "Decrease stock", exact: true }),
  ).toBeVisible()
  await page.keyboard.press("Escape")

  await page.goto("/clients")
  await expect(
    page.getByRole("cell", { name: data.clientName, exact: true }),
  ).toBeVisible()
})
