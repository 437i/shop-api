# Tasks

## 1. Локализация

- [x] 1.1 Добавить ключи EN/RU в `frontend/src/shared/i18n/locales/en/common.json` и `ru/common.json`: `products.loading` ("Loading products..." / "Загрузка товаров..."), `products.columns.name` ("Name" / "Название"), `products.columns.category` ("Category" / "Категория"), `products.columns.price` ("Price" / "Цена"), `products.columns.availableStock` ("Available Stock" / "Доступный остаток"), `products.empty` ("No products in stock" / "Нет товаров в наличии"); `navigation.products` уже существует и не дублируется; проверить паритет наборов новых ключей в обоих файлах и что `npm run test` проходит без регрессий существующих тестов локализации

## 2. Страница списка товаров

- [x] 2.1 Создать `frontend/src/pages/products/ProductsListPage.tsx` по паттерну `SuppliersListPage.tsx`: `useQuery({ queryKey: ["products"], queryFn: () => apiClient.get<ProductListResponse[]>("/products") })`, где тип — `components["schemas"]["internal_product.ListResponse"]` из `schema.d.ts` (без регенерации типов); skeleton 5 строк × 4 колонки с `role="status"` и aria-label `products.loading`; таблица с колонками Name (`name`), Category (`category?.name`), Price (`price` без преобразований), Available Stock (`available_stock`), значения с `?? ""`; empty state с иконкой `PackageIcon` и текстом `products.empty`; Alert при ошибках через `resolveProductsError` (NetworkError → `errors.network`; 401 → null; прочие ApiError → `responseMessage ?? errors.server`); заголовок страницы `navigation.products`; без dropdown-меню действий и без кнопки повторной загрузки; проверить рендер через unit-тесты задачи 2.2
- [x] 2.2 Написать `frontend/src/test/products-list-page.test.tsx` по образцу `suppliers-list-page.test.tsx`: запрос с Bearer-заголовком на `/api/v1/products`; skeleton (20 заглушек, таблица не отображается); таблица с точными значениями всех колонок, включая `price` строкой и `category.name`; отсутствующая `category` → пустая ячейка; пустой массив → "No products in stock", иконка пустого состояния (наличие `svg` внутри блока empty state, без привязки к внутренней структуре React-компонента) и отсутствие таблицы; 500 с `message` → сообщение из ответа; 500 без `message` → "Server error. Please try again later."; 503 (тело `{error: ...}`) → тот же fallback; сетевая ошибка → "Network error. Please try again."; 401 → глобальный обработчик вызван, токен удалён, Alert и таблица отсутствуют; повторное монтирование страницы с общим QueryClient в пределах staleTime (5 минут) отдаёт данные из кеша без нового запроса и без skeleton; возврат фокуса на вкладку (событие `visibilitychange`) при детерминированно устаревших данных (данные помечены устаревшими заранее, например через `queryClient.setQueryData` с `updatedAt` старше staleTime; без `sleep` и ожиданий наугад) инициирует фоновый повторный запрос, кешированные данные остаются в таблице и skeleton не отображается; возврат фокуса в пределах staleTime нового запроса не инициирует; RU-локализация заголовков, empty state и сообщения об ошибке; проверить, что `npm run test` проходит

## 3. Маршрут и навигация

- [x] 3.1 Добавить `{ path: "/products", element: <ProductsListPage /> }` в `frontend/src/app/router.tsx` внутрь существующей защищённой ветки; в `frontend/src/app/AdminLayout.tsx` добавить `isProductsActive = location.pathname === "/products"` и заменить disabled `SidebarMenuButton` Products на ссылку `Link to="/products"` с `isActive` (иконка `PackageIcon` уже импортирована); Suppliers и остальные пункты не менять; проверить, что `npm run typecheck` проходит
- [x] 3.2 Обновить `frontend/src/test/admin-layout.test.tsx` (добавить маршрут `/products` в тестовый layout, заменить сценарии «Products disabled» на: Products — ссылка с `href="/products"`; при пути `/products` пункт активен; клик по Products открывает `/products`) и `frontend/src/test/routing.test.tsx` (заменить оба assertion про disabled Products на ссылку и добавить сценарий защищённого доступа к `/products` с заголовком страницы); сохранить без изменений сценарии Suppliers, logout, переключения языка и protected-доступа; проверить, что `npm run test` проходит

## 4. E2E-сценарии

- [x] 4.1 Расширить `frontend/e2e/helpers.ts`: фикстуры `MOCK_PRODUCTS` (несколько товаров с разными `category.name`, `price`, `available_stock`), обработчик `GET /api/v1/products` (regex с `$`, чтобы не перехватывать другие продуктовые пути), опции `productsList` (переопределение набора, например для пустого списка) и `productsListError` (статус и сообщение); обновить `frontend/e2e/auth.spec.ts`: Products — ссылка `href="/products"` вместо disabled-кнопки, Suppliers остаётся ссылкой; проверить, что `npm run test:e2e` проходит
- [x] 4.2 Создать `frontend/e2e/products-list.spec.ts`: переход по пункту меню «Products» открывает `/products` с выделенным активным пунктом и заголовком; успешный список отображает значения колонок (Name, Category, Price, Available Stock) из `MOCK_PRODUCTS`; пустой список (`productsList` = `[]`) → empty state "No products in stock"; ошибка загрузки (`productsListError` 500 с `message`) → Alert с этим сообщением и без таблицы; после logout обращение к `/products` перенаправляет на `/auth/login`; проверить, что `npm run test:e2e` проходит

## 5. Интеграционные проверки

- [x] 5.1 Запустить `npm run check` (typecheck, lint, unit-тесты, production build) и убедиться, что всё проходит без ошибок
- [x] 5.2 Запустить `npm run test:e2e` и убедиться, что все сценарии (auth, language, clients-management, suppliers-management, products-list) проходят без регрессий
- [x] 5.3 Ручная проверка против локального стека (Go API с dev-mock auth, PostgreSQL, Vite dev server, без перехвата API): (1) вход через UI и переход на `/products`, список сверить с реальным ответом `GET /api/v1/products`; (2) при пустой БД — empty state; (3) убедиться, что в БД есть поставщик (`supplier_id` обязателен в `CreateRequest`; при отсутствии — создать поставщика), создать товар через `POST /api/v1/products` с телом, содержащим обязательные `name`, `price`, `available_stock > 0`, `supplier_id` и вложенный `category` с `name` (категория создаётся сервером при необходимости через `GetOrCreate`), обновить страницу — товар виден с полями из `ListResponse`; (4) уменьшить остаток до 0 через `PATCH /api/v1/products/{id}/stock` и убедиться, что после обновления страницы товар отсутствует в списке (контракт возвращает только `available_stock > 0`); (5) удалить тестовый товар через `DELETE /api/v1/products/{id}` и убедиться, что тестовых данных не осталось; записать результат проверки в этот файл
- [x] 5.4 Проверить отсутствие новых ограничений окружения: раздел работает при dev-mock auth, новых зависимостей и переменных окружения нет (`package.json` не менялся, `import.meta.env`/`VITE_` не используются); при необходимости обновить `frontend/README.md` только фактами, если обнаружено расхождение; зафиксировать вывод в этом файле

## Результаты интеграционных проверок

### 5.1 — `npm run check`

Запущено в `frontend/`: typecheck + lint + unit-тесты + production build. Без ошибок: Vitest — 12 файлов, 264 теста, все прошли; сборка `✓ built`. Единственное предупреждение — существовавшее ранее «Some chunks are larger than 500 kB» (не ошибка, к изменению не относится).

### 5.2 — `npm run test:e2e`

Playwright (chromium): 19/19 тестов прошли — auth (4), language (1), clients-management (4), suppliers-management (5), products-list (5). Регрессий нет.

### 5.3 — Ручная проверка против локального стека

Стек: docker-compose (`be3-postgres`, `be3-api` — Go API с `app.MockModule`, dev-mock auth) + Vite dev server (http://127.0.0.1:5173, прокси `/api/v1` → 127.0.0.1:8080), без перехвата API. Проверка выполнена скриптом Playwright, который работает в реальном браузере через форму входа UI и реальные запросы API; все мутации — прямыми запросами к API. 22/22 проверок пройдено:

1. Вход через UI (dev-mock auth) и переход на `/products`: заголовок страницы и активный пункт меню отображаются; список сверен с реальным ответом `GET /api/v1/products`.
2. Пустая БД (`GET /products` → `[]`): отображается empty state "No products in stock", таблица отсутствует.
3. В БД поставщиков не было — создан через `POST /api/v1/suppliers`; товар создан через `POST /api/v1/products` с `name`, `price: "123.45"`, `available_stock: 4`, `supplier_id`, вложенным `category.name` (категория создана сервером через GetOrCreate). После обновления страницы строка таблицы совпадает с `ListResponse`: "Manual Check Fridge" / "Manual Check Category" / "123.45" / "4".
4. `PATCH /api/v1/products/{id}/stock` `{ "amount": 4 }` → 204; `GET /api/v1/products` больше не содержит товар; `GET /api/v1/products/{id}` → 200 с `available_stock: 0` (товар существует, но не в списке). После обновления страницы товар отсутствует, снова отображается empty state.
5. `DELETE /api/v1/products/{id}` → 204, повторный `GET /products/{id}` → 404; созданный поставщик удалён (`DELETE /suppliers/{id}` → 204); тестовая категория удалена триггером `trg_products_delete_orphan_category`. Итоговые `GET /products` и `GET /suppliers` совпадают с исходным состоянием; в БД `products=0, suppliers=0, categories=0, addresses=0` — тестовых данных не осталось.

### 5.4 — Ограничения окружения

- `frontend/package.json` и `frontend/package-lock.json` не изменялись (git diff пуст) — новых зависимостей нет.
- `import.meta.env` / `VITE_` не используются в `frontend/src`, `frontend/e2e` и `frontend/vite.config.ts`.
- Раздел работает при dev-mock auth (проверено в 5.3).
- Расхождений с `frontend/README.md` не обнаружено: он уже описывает dev-mock auth и тестовую инфраструктуру; обновление README не требуется.

**Вывод:** все интеграционные проверки 5.1–5.4 пройдены; изменение готово к ревью и архивации.

## Workflow follow-up

- Не архивировать изменение, пока не пройдены `npm run check`, `npm run test:e2e` и ручная проверка 5.3.
- После ревью и прохождения всех проверок заархивировать изменение (openspec archive), убедившись, что все задачи отмечены выполненными.
- После архивации проверить, что основная спецификация `frontend/products-list` создана с корректным Purpose, а `frontend/protected-navigation` содержит обновлённое требование «Административный layout содержит навигацию» с активным пунктом Products.
