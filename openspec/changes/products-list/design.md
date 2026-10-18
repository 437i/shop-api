# Design

## Context

См. proposal.md — Why. Frontend-архитектура уже сформирована изменениями `admin-panel-foundation`, `clients-management` и `suppliers-management`: страницы разделов лежат в `frontend/src/pages/<domain>/`, данные загружаются через TanStack Query и общий `apiClient`, состояния рендерятся по единому паттерну (skeleton → Alert → empty state → таблица), тексты — через i18next (EN/RU), тесты — Vitest + Testing Library и Playwright с `page.route()`.

Факты контракта, влияющие на дизайн (проверены по `api/docs/swagger.yaml`, `api/internal/product/` и router):
- `GET /api/v1/products` возвращает 200 массив `internal_product.ListResponse` (`id`, `name`, `category {id, name}`, `price` — строка, `available_stock` — число, `image_id`), 500 при ошибке сервера; 401/503 добавляет auth middleware (`api/internal/server/middleware.go`, тела с полем `error`, без `message`).
- Repository возвращает только товары с `available_stock > 0`; пагинации, фильтров и сортировки в контракте нет.
- Frontend приложения в этом изменении использует только `GET /products`; `GET /products/{id}`, `/products/{id}/image` и `/images/{id}` из кода не вызываются. `POST /products`, `PATCH /products/{id}/stock` и `DELETE /products/{id}` могут вызываться только вручную в рамках интеграционной проверки задачи 5.3 для подготовки и очистки тестовых данных (см. proposal.md и tasks.md 5.3).
- Типы `internal_product.ListResponse` уже сгенерированы в `frontend/src/shared/api/generated/schema.d.ts`.

Текущие тесты фиксируют старое поведение навигации (Products disabled): `frontend/src/test/admin-layout.test.tsx:60`, `:105`, `frontend/src/test/routing.test.tsx:101`, `:127`. Их нужно обновить вместе с изменением требования `frontend/protected-navigation`.

## Goals / Non-Goals

**Goals:**
- Новая защищённая страница `/products` со списком товаров в наличии по паттернам существующих страниц.
- Активация пункта Products в sidebar и защищённого маршрута `/products`.
- Локализация EN/RU и тестовое покрытие (unit + E2E), согласованное с контрактом.

**Non-Goals:**
- Любые действия над товарами (создание, удаление, остаток, изображения, детали) — см. proposal.
- Расширение `apiClient` бинарными возможностями, новый UI-кит, новые зависимости, изменения i18n-конфигурации.
- Добавление фильтров/пагинации/сортировки на клиенте.
- Backend, DTO, миграции, контракт.

## Decisions

### 1. Размещение и состав страницы

**Решение:** новый файл `frontend/src/pages/products/ProductsListPage.tsx` по образцу `SuppliersListPage.tsx`/`ClientsListPage.tsx`. Компонент: заголовок (`navigation.products`), один `useQuery`, четыре условных блока (skeleton / Alert / empty / table). Пустые заготовки `frontend/src/features/*` и `frontend/src/entities/*` не задействуются.

**Альтернативы:** перенос в `features/products/` — отвергнут: существующие страницы разделов лежат в `pages/`, `features/` пуст и не используется.

### 2. Интеграция с API и владение состоянием

**Решение:** `useQuery({ queryKey: ["products"], queryFn: () => apiClient.get<ProductListResponse[]>("/products") })`, где `ProductListResponse = components["schemas"]["internal_product.ListResponse"]`. Ключ `["products"]` — единая точка для будущих мутаций и инвалидации; отдельный модуль мутаций сейчас не создаётся, так как мутаций нет. Server state полностью во владении TanStack Query, локальный `useState` не нужен.

Bearer-заголовок, обработка 204 и глобальная обработка 401 обеспечиваются существующим `apiClient`; страница не дублирует эту логику и не показывает Alert при 401.

**Альтернативы:** собственный fetch — отвергнут; `GET /products/{id}` для деталей — не требуется контрактом списка; загрузка `supplier` — отсутствует в `ListResponse`.

### 3. Рендер таблицы

**Решение:** колонки Name (`name`), Category (`category?.name`), Price (`price` без преобразований) и Available Stock (`available_stock`), значения с безопасными пустыми строками `?? ""` по паттерну suppliers. Dropdown-меню действий не рендерится — действий в scope нет. Empty state — иконка `PackageIcon` (уже используется для Products в `AdminLayout`) и сообщение `products.empty`.

**Обоснование:** только поля `ListResponse`; `last_update_date` и данные поставщика в списке отсутствуют, `image_id` не отображается (изображения вне scope). Цена не форматируется: контракт не описывает валюту или локаль.

### 4. Состояния загрузки, ошибок и восстановление

**Решение:** skeleton — 5 строк × 4 колонки с `role="status"` и aria-label `products.loading` (как в suppliers). Ошибки резолвятся функцией по образцу `resolveSuppliersError`: `NetworkError → errors.network`; `ApiError` со статусом 401 → `null` (сработал глобальный сброс сессии); прочие `ApiError` → `responseMessage ?? errors.server`. Для 503 middleware отдаёт `{error: ...}` без `message`, поэтому отображается фолбэк `errors.server`. Статус 400 для запроса контрактом не предусмотрен.

Кнопка повторной загрузки не добавляется: в существующих страницах её нет, `QueryClient` работает с `retry: false`, `staleTime: 5 минут` и `refetchOnWindowFocus: true`. По правилам TanStack Query возврат фокуса вкладки повторяет запрос только для устаревших данных (старше staleTime), а кешированные данные остаются отображёнными во время фонового обновления; данные в пределах staleTime новый запрос из-за фокуса не вызывают. Восстановление после ошибки — повторный фокус вкладки (запрос без данных считается устаревшим) или повторное открытие страницы. Это осознанно: вводить новое поведение в этом изменении не требуется.

**Trade-off:** пользователь не может явно перезапросить данные кнопкой — согласовано с текущей архитектурой, изменение общего поведения вне scope.

### 5. Навигация и маршрутизация

**Решение:** в `AdminLayout` добавить `isProductsActive = location.pathname === "/products"`, заменить disabled `SidebarMenuButton` Products на кнопку с `render={<Link to="/products" />}` и `isActive` (иконка `PackageIcon` уже импортирована). В `router.tsx` добавить `{ path: "/products", element: <ProductsListPage /> }` в children защищённой ветки. Suppliers и остальные маршруты не меняются.

**Обязательное следствие:** тесты, фиксирующие Products как disabled (`admin-layout.test.tsx`, `routing.test.tsx`), обновляются: disabled-сценарий Products заменяется ссылкой/навигацией, сценарии Suppliers, logout, языка и protected-доступа сохраняются.

**Спецификация:** MODIFIED-блок требования сохраняет все три существующих заголовка сценариев: правила OpenSpec 1.14 для MODIFIED отклоняют удаление и переименование сценариев (validate и archive используют общую проверку отсутствующих заголовков). Сценарий «Неактивные разделы недоступны» сохраняет заголовок как идентификатор, его содержимое обновляется до «неактивных разделов нет, все пункты — активные ссылки»; дополнительно добавляется сценарий «Переход в раздел товаров» по образцу сценария «Переход в раздел поставщиков».

### 6. Локализация

**Решение:** новый раздел `products` в `en/common.json` и `ru/common.json`: `loading`, `columns.{name,category,price,availableStock}`, `empty`. Ключ `navigation.products` уже существует. Формулировки: EN "Name", "Category", "Price", "Available Stock", "No products in stock", "Loading products..."; RU "Название", "Категория", "Цена", "Доступный остаток", "Нет товаров в наличии", "Загрузка товаров...". Формулировка empty state отражает семантику контракта: в списке могут отсутствовать товары, которые есть в реестре, но с нулевым остатком.

### 7. Тестирование

**Решение:**
- Unit: `frontend/src/test/products-list-page.test.tsx` по образцу `suppliers-list-page.test.tsx` — skeleton (20 заглушек), empty state, успешный список с Bearer и значениями колонок (включая `price` как строку), 500 с `message`, 500 без `message`, 503, сетевая ошибка, 401 с очисткой сессии, кеш при повторном монтировании в пределах staleTime (без нового запроса и skeleton), фоновый повторный запрос при возврате фокуса после заблаговременного детерминированного устаревания данных (без `sleep`) с сохранением кешированных данных в таблице и отсутствие нового запроса при возврате фокуса в пределах staleTime, RU-локализация заголовков, empty state и сообщения об ошибке.
- Обновление `admin-layout.test.tsx` и `routing.test.tsx` под новое поведение навигации без удаления сценариев Suppliers/logout/protected-доступа.
- E2E: расширить `frontend/e2e/helpers.ts` фикстурами `MOCK_PRODUCTS` и обработчиком `GET /api/v1/products` (regex с `$`, чтобы не перехватывать другие продуктовые пути), опциями переопределения набора товаров (например, `productsList` — для пустого списка) и ошибки загрузки списка товаров; обновить `frontend/e2e/auth.spec.ts`: Products — ссылка `href="/products"` вместо disabled-кнопки; новый `frontend/e2e/products-list.spec.ts`: открытие через sidebar с active-состоянием, успешная таблица, empty state, ошибка загрузки, сохранение protected-доступа после logout.
- Итоговые проверки: `npm run check` (typecheck + lint + unit + build) и `npm run test:e2e`; ручная проверка `/products` против реального стека (docker compose Go API + PostgreSQL + Vite, dev-mock auth) с curl-сравнением ответа `GET /api/v1/products`.

**Обоснование:** только существующая тестовая инфраструктура; E2E на `page.route()` проверяет UI-контракт, реальный API проверяется вручную, что явно документируется.

## Risks / Trade-offs

- **[Риск] Обновление тестов, фиксирующих Products как disabled, затронет существующие сценарии.** → Изменяются только assertions про Products; сценарии Suppliers, logout, языка и protected-доступа сохраняются, e2e в `suppliers-management.spec.ts` продолжает проверять active-состояние Suppliers.
- **[Риск] `price` — строка без валюты; неверное форматирование создаст данные, которых нет в контракте.** → Выводим значение как есть; в спеке это закреплено.
- **[Риск] Все поля `ListResponse` опциональны в сгенерированных типах.** → Безопасные `?? ""` и тесты с частичными данными, как в suppliers.
- **[Риск] Пустой список можно ошибочно понять как «товаров нет вообще».** → Формулировка empty state «No products in stock» / «Нет товаров в наличии»; в спецификации зафиксирована семантика `available_stock > 0`.
- **[Trade-off] Нет кнопки повторной загрузки и действий в строках.** → Соответствует текущей архитектуре; действия появятся в отдельных изменениях (создание, изображения, остаток).

## Migration Plan

Не применимо: чистый frontend без изменений данных и конфигураций. Изменение обратимо откатом коммита, при этом пункт Products возвращается в disabled-состояние.
