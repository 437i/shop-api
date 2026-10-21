# Proposal

## Why

Раздел «Товары» в административной панели работает только на чтение: каталог нельзя наполнить, удалить из него товар или отразить продажу уменьшением остатка. Это единственный из трёх разделов, где write-операции не реализованы, хотя Go API полностью их поддерживает (`POST /products`, `DELETE /products/{id}`, `PATCH /products/{id}/stock`). Без этих операций административная панель не может выполнять основную задачу магазина — управлять каталогом.

## What Changes

- Диалог создания товара: Name, Category (свободный текст), Price, Available stock, Supplier (выбор из существующих поставщиков) → `POST /api/v1/products`; клиентская валидация зеркалит правила backend; при 201 диалог закрывается, кеш `["products"]` инвалидируется, товар появляется в списке.
- Удаление товара из строки списка только после подтверждения → `DELETE /api/v1/products/{id}`; при 204 кеш инвалидируется, строка исчезает.
- Уменьшение остатка из строки списка → `PATCH /api/v1/products/{id}/stock` с телом `{"amount": <целое > 0>}`; ошибка 409 «insufficient stock» отображается сообщением из ответа; при 204 кеш инвалидируется.
- Предупреждение при уменьшении остатка до 0: товар исчезает из списка, так как `GET /products` возвращает только товары с `available_stock > 0`, а операции увеличения остатка в API нет.
- Меню действий в каждой строке таблицы товаров: «Decrease stock» и «Delete» (операции редактирования полей товара в API нет — пункт не добавляется).
- Ключи локализации EN/RU для всех новых текстов.
- Unit-тесты (Vitest + Testing Library) и E2E-тесты (Playwright, `page.route()`).

## Capabilities

### New Capabilities

- `frontend/products-management`: создание товара с выбором поставщика и валидацией по контракту, удаление с подтверждением, уменьшение остатка с обработкой 409 и предупреждением о нулевом остатке, инвалидация кеша `["products"]`, локализация EN/RU.

### Modified Capabilities

- `frontend/products-list`: требование «Успешный ответ с данными отображает таблицу» — каждая строка получает меню действий с пунктами уменьшения остатка и удаления.

## Impact

**Затронутый код:**
- `frontend/src/pages/products/` — расширенный `ProductsListPage.tsx`, новые `CreateProductDialog.tsx`, `DeleteProductDialog.tsx`, `DecreaseStockDialog.tsx`, `productFormSchema.ts`, `useProductMutations.ts`.
- `frontend/src/shared/i18n/locales/en/common.json`, `ru/common.json` — новые ключи.
- `frontend/src/test/`, `frontend/e2e/` — новые и расширенные тесты.
- `frontend/src/shared/api/client.ts` — без изменений: методов `get`, `post`, `patch`, `delete` достаточно.
- `frontend/src/pages/suppliers/useSupplierMutations.ts` — без изменений кода; экспортируемый ключ `SUPPLIERS_QUERY_KEY` переиспользуется для выбора поставщика в форме создания товара (общий кеш, без дублирующего запроса).

**API endpoints:**
- `GET /api/v1/products` → 200 массив `internal_product.ListResponse` (только товары с `available_stock > 0`); 500; требует Bearer-авторизацию.
- `POST /api/v1/products` (`internal_product.CreateRequest`: `name`, `category.name`, `price` — строка, `available_stock` — целое `> 0`, `supplier_id`) → 201 `internal_product.CreateResponse`; 400 (`invalid request body`, `empty name`, `empty price`, `invalid price`, `empty category`); 404 (`supplier not found`); 500.
- `DELETE /api/v1/products/{id}` → 204; 400 (`invalid product id`); 404 (`product not found`); 500. FK-ссылок на `products` в БД нет; триггеры удаляют осиротевшие image и category.
- `PATCH /api/v1/products/{id}/stock` (`internal_product.DecreaseStockRequest`: `amount` — целое `> 0`) → 204; 400; 404; 409 (`insufficient stock`); 500.
- `GET /api/v1/suppliers` → 200 массив `internal_supplier.Response`; используется для выбора поставщика в форме создания товара.
- Ответы auth middleware: 401 (глобальный сброс сессии) и 503 (сообщение `{"error": ...}` без поля `message` — используется локализованный fallback) — существующая обработка без изменений.

**Ограничения контракта:**
- `GET /categories` в API отсутствует: категория вводится свободным текстом, backend выполняет `GetOrCreate` по точному имени (совпадение с учётом регистра, trim пробелов). Подсказки категорий из списка товаров не добавляются — список содержит только товары в наличии и не является полным справочником.
- `price` — строка с правилом backend `^[1-9]\d{0,9}(\.\d{1,2})?$`; значение отправляется без преобразования.
- `available_stock` при создании строго `> 0` (binding `gt=0`); уменьшение остатка — единственная операция изменения остатка, увеличение невозможно.
- Редактирование полей существующего товара (name, price, category, supplier) в API отсутствует — вне scope.
- Товар с остатком 0 недоступен ни в списке `GET /products`, ни для восстановления остатка; предупреждение в UI — единственная защита от неожиданной потери товара.
- Изображения товаров, детальная страница `/products/:id`, фильтры и пагинация — вне scope (отдельные будущие изменения).

**Зависимости:**
- Только существующие пакеты: react-hook-form, zod, TanStack Query, shadcn/ui (`dialog`, `alert-dialog`, `dropdown-menu`, `table`, `select`), i18next, Vitest, Playwright. Новых зависимостей нет.
- Типы `internal_product.*` и `internal_supplier.Response` уже сгенерированы в `frontend/src/shared/api/generated/schema.d.ts` — регенерация не требуется.
- Go API, БД и миграции не изменяются; backend-правки вне scope.

**Системы:**
- Go HTTP API — источник истины для всех полей, статусов и сообщений.
- Локальная проверка — против существующего стека с dev-mock auth-модулем Go API (реальная аутентификация недоступна до подключения Java auth service; ограничение уже задокументировано в `frontend/README.md`).


> **Уточнение (2026-10-21).** Описанное выше — состояние на момент архивации: стенд использовал dev-mock auth, реальная аутентификация была недоступна. С тех пор `docker-compose` поднимает Java auth service (`auth`, `auth-postgres`), `cmd/api` запускает `app.Module` с реальным gRPC-клиентом, а dev-mock приведён в соответствие и остаётся опциональной альтернативой; поэтому приведённые выше утверждения о недоступности реального auth service, об актуальности `frontend/README.md` и о работе раздела только при dev-mock auth не описывают текущий стенд — см. `frontend/README.md`, раздел «Local authentication».

**Незавершённые вопросы:**
- Нет блокирующих. Принятые решения: (1) категория — свободный текст по правилу `GetOrCreate`, без предложений из неполного источника; (2) значения price и amount отправляются в точном виде, где это строки, а остаток конвертируется в целое число на границе мутации; (3) серверные сообщения об ошибках (в том числе англоязычное `insufficient stock`) отображаются как есть — та же политика, что в `clients-management` и `suppliers-management`; (4) при уменьшении остатка до 0 показывается предупреждение, но операция не блокируется.
