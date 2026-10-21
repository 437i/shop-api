# Tasks

## 1. Схемы формы и локализация

- [x] 1.1 Создать `frontend/src/pages/products/productFormSchema.ts`: экспортируемые `isValidPrice` (шаблон `^[1-9]\d{0,9}(\.\d{1,2})?$`, точное повторение `api/internal/product/dto.go`) и `isValidPositiveInteger` (`^[1-9]\d*$`); zod-схему `createProductSchema` (name — обязательно, max 255; category — обязательно, max 255; price — обязательно, валидный по шаблону; stock — обязательно, положительное целое без ведущих нулей; supplierId — обязательно) с i18n-ключами сообщений; фабрику `createDecreaseStockSchema(availableStock)` (amount — обязательно, положительное целое, не больше `availableStock`); типы `ProductFormValues`, `DecreaseStockFormValues`; значения формы остаются строками; проверить, что `npm run typecheck` проходит
- [x] 1.2 Написать `frontend/src/test/products-management-schema.test.ts`: price — `10` и `999.99` валидны, `0.5`, `007`, `10.123`, `abc`, пустая строка, 11 цифр целой части невалидны, 10 цифр валидны; stock — `1` валиден, `0`, `-1`, `1.5`, `007`, `abc` невалидны; amount — границы «равно остатку» (валидно) и «больше остатка» (невалидно), пустое и дробное невалидны; обязательность supplierId; проверить, что `npm run test` проходит
- [x] 1.3 Добавить ключи EN/RU в `frontend/src/shared/i18n/locales/en/common.json` и `ru/common.json`: `products.actions.*` (addProduct, menuLabel с `{{name}}`, decreaseStock, delete, deleteNamed с `{{name}}`), `products.create.*` (title, nameLabel, categoryLabel, priceLabel, stockLabel, supplierLabel, supplierPlaceholder, suppliersLoading, suppliersEmpty, suppliersError, submit, submitting, cancel), `products.decreaseStock.*` (title, description с `{{name}}` и `{{stock}}`, amountLabel, zeroWarning, submit, submitting, cancel), `products.delete.*` (title, description с `{{name}}`, confirm, deleting, cancel), `products.validation.*` (nameRequired, nameMax, categoryRequired, categoryMax, priceRequired, priceInvalid, stockRequired, stockInvalid, supplierRequired, amountRequired, amountInvalid, amountTooLarge), `errors.productNotFound`, `errors.insufficientStock`; проверить паритет наборов ключей в обоих файлах и `npm run test`

## 2. Мутации и список товаров

- [x] 2.1 Создать `frontend/src/pages/products/useProductMutations.ts`: константа `PRODUCTS_QUERY_KEY = ["products"]`; `resolveProductMutationError(error, translate, notFoundKey?)` (NetworkError → `errors.network`; 400 → `message` или `errors.invalidRequest`; 404 → `message` или `notFoundKey` (по умолчанию `errors.productNotFound`); 409 → `message` или `errors.insufficientStock`; остальное → `message` или `errors.server`; 401 → null); `useCreateProduct` (`POST /products`, тело ровно `{name, category: {name}, price, available_stock: Number(stock), supplier_id}`, price — строка без преобразования; инвалидация `PRODUCTS_QUERY_KEY` только при 201); `useDeleteProduct` (`DELETE /products/{id}`, инвалидация при 204); `useDecreaseStock` (`PATCH /products/{id}/stock`, тело ровно `{amount: Number(amount)}`, инвалидация при 204); проверить, что `npm run typecheck` проходит
- [x] 2.2 Расширить `frontend/src/pages/products/ProductsListPage.tsx`: перевести `useQuery` на `PRODUCTS_QUERY_KEY`; добавить кнопку "Add product" на тулбар; добавить в последнюю колонку меню действий строки (`dropdown-menu`) с пунктами "Decrease stock" и "Delete" и доступным именем меню (`products.actions.menuLabel`); пункт "Edit" не добавляется; состояния списка (skeleton, empty, ошибки, кеш) не меняются; обновить `frontend/src/test/products-list-page.test.tsx`: меню действий есть в каждой строке, существующие проверки списка проходят; проверить, что `npm run test` проходит
- [x] 2.3 Прогнать существующий `frontend/e2e/products-list.spec.ts` после добавления меню действий и кнопки создания; при необходимости обновить ожидания; проверить, что `npm run test:e2e` проходит без регрессий

## 3. Создание товара

- [x] 3.1 Создать `frontend/src/pages/products/CreateProductDialog.tsx` и подключить кнопку "Add product" на странице: поля Name, Category, Price, Available Stock, Supplier, связанные с label через htmlFor/id; выбор поставщика — shadcn `Select` с `useQuery({ queryKey: SUPPLIERS_QUERY_KEY })` (импорт ключа из `@/pages/suppliers/useSupplierMutations`), опции: label — `name`, value — `id`; состояния поставщиков: загрузка — select и отправка disabled, ошибка — `products.create.suppliersError` и отправка disabled, пустой список — `products.create.suppliersEmpty` и отправка disabled; ошибки валидации с i18n-ключами; серверная ошибка отображается, диалог остаётся открытым со значениями; кнопки disabled во время запроса; при закрытии — сброс формы и мутации; проверить рендер через unit-тесты задачи 3.2
- [x] 3.2 Написать `frontend/src/test/products-management.test.tsx` (часть про создание): невалидная форма не отправляет запрос; точное тело POST (`price` — строка, `available_stock` — число, `supplier_id` выбранного поставщика); опции поставщиков из `GET /suppliers`; загрузка/ошибка/пустой список поставщиков блокируют отправку; 201 закрывает диалог, инвалидирует `PRODUCTS_QUERY_KEY`; 400 с `message` и без; 404 с `supplier not found` и без (fallback `errors.supplierNotFound`); 500/503 и сетевая ошибка; введённые значения сохранены при ошибке; disabled во время запроса; локализация RU; проверить, что `npm run test` проходит
- [x] 3.3 Расширить `frontend/e2e/helpers.ts` перехватами `GET /api/v1/suppliers` (фикстура для select) и `GET/POST /api/v1/products` (in-memory список, флаги ошибок) и создать `frontend/e2e/products-management.spec.ts` со сценарием: создание товара с выбранным поставщиком закрывает диалог и добавляет строку в таблицу; проверить, что `npm run test:e2e` проходит

## 4. Удаление товара

- [x] 4.1 Создать `frontend/src/pages/products/DeleteProductDialog.tsx` на `alert-dialog` с именем товара в описании и доступном имени действия; подключить пункт "Delete" меню действий строки; кнопки disabled во время запроса; ошибка отображается внутри диалога; проверить поведение через unit-тесты задачи 4.2
- [x] 4.2 Дополнить `frontend/src/test/products-management.test.tsx` (часть про удаление): отмена не отправляет запрос; подтверждение отправляет `DELETE /products/{id}`; успех 204 закрывает диалог, инвалидирует кеш и удаляет строку; 404 с `message` и без (fallback `errors.productNotFound`); 500/503 и сетевая ошибка; список не меняется и не инвалидируется при ошибке; disabled во время запроса; локализация RU; проверить, что `npm run test` проходит
- [x] 4.3 Расширить `frontend/e2e/helpers.ts` перехватом `DELETE /api/v1/products/{id}` и добавить в `products-management.spec.ts` сценарий: удаление только после подтверждения (отмена — запроса нет), успешное удаление убирает строку; проверить, что `npm run test:e2e` проходит

## 5. Уменьшение остатка

- [x] 5.1 Создать `frontend/src/pages/products/DecreaseStockDialog.tsx`: диалог с именем товара и текущим `available_stock` из выбранной строки (без дополнительного запроса), поле amount, схема `createDecreaseStockSchema`; при сумме, равной текущему остатку, отображается `products.decreaseStock.zeroWarning` (отправка не блокируется); подключить пункт "Decrease stock" меню действий строки; кнопки disabled во время запроса; ошибка отображается внутри диалога; проверить поведение через unit-тесты задачи 5.2
- [x] 5.2 Дополнить `frontend/src/test/products-management.test.tsx` (часть про остаток): отмена не отправляет запрос; предзаполнение имени и остатка; невалидная сумма (пусто, `0`, `1.5`, больше остатка) не отправляет запрос; точное тело PATCH (`amount` — число); предупреждение при сумме, равной остатку, и его отсутствие при меньшей сумме; успех 204 закрывает диалог и инвалидирует кеш, обновлённый список показывает уменьшенный остаток; уменьшение до 0 — обновлённый список без строки товара; 409 с `message` и без (fallback `errors.insufficientStock`), форма остаётся открытой; 500/503 и сетевая ошибка; локализация RU; проверить, что `npm run test` проходит
- [x] 5.3 Расширить `frontend/e2e/helpers.ts` перехватом `PATCH /api/v1/products/{id}/stock` и добавить в `products-management.spec.ts` сценарии: уменьшение остатка обновляет значение в строке; уменьшение до нуля показывает предупреждение и убирает строку из списка; ошибка 409 отображается в диалоге; проверить, что `npm run test:e2e` проходит

## 6. Интеграционные проверки

- [x] 6.1 Запустить `npm run check` (typecheck, lint, unit-тесты, production build) и убедиться, что всё проходит без ошибок
- [x] 6.2 Запустить `npm run test:e2e` и убедиться, что все сценарии (auth, language, clients-management, suppliers-management, products-list, products-management) проходят без регрессий
- [x] 6.3 Ручная проверка против локального стека (Go API с dev-mock auth, PostgreSQL, Vite dev server, без перехвата API): (1) при необходимости создать поставщика через UI; (2) создать товар через UI с новой категорией → 201, строка появилась; создать второй товар с тем же именем категории → проверить через `GET /api/v1/products`, что `category.id` совпадает (`GetOrCreate`); (3) уменьшить остаток товара с остатком 2 на 1 → строка показывает 1; (4) уменьшить остаток на 1 (до нуля) → предупреждение видно, `PATCH` вернул 204, строка исчезла из списка; `GET /api/v1/products/{id}` → 200 с `available_stock` 0 (список скрывает товар, как и предусмотрено контрактом); (5) удалить товар через UI → 204, строка исчезла; очистить тестовые данные и записать результат проверки в этот файл
- [x] 6.4 Проверить, что приложение не создаёт новых ограничений окружения: раздел работает при недоступном реальном auth service (используется dev-mock), `frontend/README.md` не требует изменений; зафиксировать вывод в этом файле

### Результаты проверок (2026-10-18)

**6.1 `npm run check`** — пройдено: typecheck, eslint (без ошибок и предупреждений), 345 unit-тестов, production build. Единственный вывод — существующее предупреждение Vite о размере чанка (>500 kB), не является ошибкой.

**6.2 `npm run test:e2e`** — пройдено: 25/25 сценариев (auth, language, clients-management, suppliers-management, products-list, products-management), включая новые сценарии удаления и уменьшения остатка.

**6.3 Проверка против локального стека** — пройдено. Стек: docker compose (PostgreSQL 18, `be3-api` healthy на :8080 с dev-mock auth-модулем), Vite dev server на 127.0.0.1:5173 с проксированием `/api/v1` на Go API, без перехвата API. Проверка выполнена браузерным сценарием против реального стека (временный скрипт, удалён после прогона); 14/14 проверок:
- вход через dev-mock auth; создание поставщика через UI;
- создание товара A (остаток 2) с новой категорией → 201, строка появилась; товар B с тем же именем категории → `GET /api/v1/products` подтверждает совпадающий `category.id` (`GetOrCreate`);
- уменьшение остатка A с 2 на 1 → строка показывает 1;
- уменьшение на 1 (до нуля) → предупреждение видно до отправки, после отправки строка исчезла; `GET /api/v1/products/{id}` → 200 с `available_stock` 0;
- удаление товара B через UI → строка исчезла;
- очистка: товар A удалён через API (скрыт из списка), поставщик удалён через UI; в `GET /api/v1/products` тестовых товаров не осталось.

**6.4 Ограничения окружения** — вывод: реальный auth service недоступен, раздел полностью работает на dev-mock auth (`POST /auth` + middleware принимают mock-токен); новых ограничений окружения и зависимостей не появляется. `frontend/README.md` уже описывает dev-mock auth и e2e-тесты без бэкенда — изменений не требует.


> **Уточнение (2026-10-21).** Описанное выше — состояние на момент архивации: стенд использовал dev-mock auth, реальная аутентификация была недоступна. С тех пор `docker-compose` поднимает Java auth service (`auth`, `auth-postgres`), `cmd/api` запускает `app.Module` с реальным gRPC-клиентом, а dev-mock приведён в соответствие и остаётся опциональной альтернативой; поэтому приведённые выше утверждения о недоступности реального auth service, об актуальности `frontend/README.md` и о работе раздела только при dev-mock auth не описывают текущий стенд — см. `frontend/README.md`, раздел «Local authentication».

## Workflow follow-up

- Не архивировать изменение, пока не пройдены `npm run check`, `npm run test:e2e` и ручная проверка 6.3.
- После ревью и прохождения всех проверок заархивировать изменение (openspec archive), убедившись, что все задачи отмечены выполненными.
- После архивации проверить, что основная спецификация `frontend/products-management` создана с корректным Purpose, а `frontend/products-list` содержит обновлённое требование «Успешный ответ с данными отображает таблицу» с меню действий строки.
