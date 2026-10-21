# Proposal

## Why

Административная панель сейчас умеет работать только с клиентами: пункты меню «Products» и «Suppliers» отключены. При этом Go API полностью поддерживает базовые операции с поставщиками (список, создание, удаление, изменение адреса), а поставщик — обязательная зависимость для создания товара (`supplier_id`). Раздел поставщиков даёт администратору первый шаг к управлению каталогом и открывает путь к разделу товаров.

## What Changes

- Новая защищённая страница `/suppliers` со списком поставщиков: таблица (Name, Phone, Country, City, Street), skeleton загрузки, empty state, Alert при ошибках — по паттернам существующей страницы клиентов.
- Диалог создания поставщика: поля Name, Phone, Country, City, Street; клиентская валидация по реальному контракту (обязательные поля, максимум 255 символов, телефон по правилу backend `^\+[1-9]\d{7,14}$` после нормализации); интеграция с `POST /api/v1/suppliers`; при 201 диалог закрывается, кеш `["suppliers"]` инвалидируется.
- Удаление поставщика из строки списка только после подтверждения; интеграция с `DELETE /api/v1/suppliers/{id}`; ошибка 400 «supplier is used by products» отображается сообщением из ответа API; при ошибке список не меняется.
- Изменение адреса поставщика из строки списка: диалог предзаполняется данными `address` из уже загруженного `SupplierResponse` (без дополнительного запроса); `PATCH /api/v1/suppliers/{id}/address` с телом ровно `{"address": {"country": "<country>", "city": "<city>", "street": "<street>"}}`; при 204 кеш инвалидируется.
- Активация пункта меню «Suppliers» в sidebar и маршрут `/suppliers` под существующей защитой `ProtectedRoute`; пункт «Products» остаётся disabled.
- Ключи локализации EN/RU для всех новых текстов.
- Unit-тесты (Vitest + Testing Library) и E2E-тесты (Playwright, `page.route()`).

## Capabilities

### New Capabilities

- `frontend/suppliers-management`: просмотр списка поставщиков, создание с валидацией, удаление с подтверждением и обработкой ошибки «supplier is used by products», изменение адреса из строки списка, инвалидация кеша `["suppliers"]`, локализация EN/RU.

### Modified Capabilities

- `frontend/protected-navigation`: требование «Административный layout содержит навигацию» — пункт «Suppliers» становится активным и открывает `/suppliers`; «Products» остаётся disabled.

## Impact

**Затронутый код:**
- `frontend/src/pages/suppliers/` — новые `SuppliersListPage.tsx`, `CreateSupplierDialog.tsx`, `DeleteSupplierDialog.tsx`, `EditSupplierAddressDialog.tsx`, `supplierFormSchema.ts`, `useSupplierMutations.ts`.
- `frontend/src/app/router.tsx` — маршрут `/suppliers` внутри защищённого layout.
- `frontend/src/app/AdminLayout.tsx` — активация пункта «Suppliers», определение активного пункта по текущему маршруту.
- `frontend/src/shared/i18n/locales/en/common.json`, `ru/common.json` — новые ключи.
- `frontend/src/test/`, `frontend/e2e/` — новые и расширенные тесты.
- `frontend/src/shared/api/client.ts` — без изменений: методов `get`, `post`, `patch`, `delete` достаточно.

**API endpoints:**
- `GET /api/v1/suppliers` → 200 массив `internal_supplier.Response` (`id`, `name`, `phone_number`, `address` с `id`, `country`, `city`, `street`); 500; требует Bearer-авторизацию.
- `POST /api/v1/suppliers` (`internal_supplier.CreateRequest`: `name`, `phone_number`, `address`) → 201 `internal_supplier.Response`; 400; 500; требует Bearer-авторизацию.
- `DELETE /api/v1/suppliers/{id}` → 204; 400 (`supplier is used by products` — ошибка FK `products.supplier_id`); 404 (`supplier not found`); 500; требует Bearer-авторизацию.
- `PATCH /api/v1/suppliers/{id}/address` (`internal_supplier.UpdateAddressRequest`) → 204; 400; 404; 500; требует Bearer-авторизацию.
- Ответы auth middleware: 401 (глобальный сброс сессии) и 503 (сообщение `{"error": ...}` без поля `message` — используется локализованный fallback) — существующая обработка без изменений.

**Ограничения контракта:**
- Обновление имени и телефона существующего поставщика отсутствует в API — вне scope; кнопка редактирования доступна только для адреса.
- Пагинация и фильтры для `GET /suppliers` отсутствуют — список загружается целиком.
- `GET /suppliers/{id}` существует, но отдельный экран поставщика не создаётся: данные строки списка достаточны для адреса.
- Backend нормализует телефон перед проверкой (`supplier/dto.go`: удаляются все символы кроме цифр и ведущего `+`), затем валидирует `^\+[1-9]\d{7,14}$`; frontend повторяет это правило только для валидации и не преобразует отправляемое значение.

**Зависимости:**
- Только существующие пакеты: react-hook-form, zod, TanStack Query, shadcn/ui (`dialog`, `alert-dialog`, `dropdown-menu`, `table`, `select` не требуется), i18next, Vitest, Playwright. Новых зависимостей нет.
- Типы `internal_supplier.*` уже сгенерированы в `frontend/src/shared/api/generated/schema.d.ts` — регенерация не требуется.
- Go API, БД и миграции не изменяются; backend-правки вне scope.

**Системы:**
- Go HTTP API — источник истины для всех полей, статусов и сообщений.
- Локальная проверка — против существующего стека с dev-mock auth-модулем Go API (реальная аутентификация недоступна до подключения Java auth service; ограничение уже задокументировано в `frontend/README.md`).


> **Уточнение (2026-10-21).** Описанное выше — состояние на момент архивации: стенд использовал dev-mock auth, реальная аутентификация была недоступна. С тех пор `docker-compose` поднимает Java auth service (`auth`, `auth-postgres`), `cmd/api` запускает `app.Module` с реальным gRPC-клиентом, а dev-mock приведён в соответствие и остаётся опциональной альтернативой; поэтому приведённые выше утверждения о недоступности реального auth service, об актуальности `frontend/README.md` и о работе раздела только при dev-mock auth не описывают текущий стенд — см. `frontend/README.md`, раздел «Local authentication».

**Незавершённые вопросы:**
- Нет блокирующих. Принятые решения: (1) телефон отправляется как введён пользователем, backend остаётся ответственным за нормализацию и хранение; (2) серверные сообщения об ошибках (в том числе англоязычное `supplier is used by products`) отображаются как есть — тот же подход, что в `clients-management`; (3) адрес редактируется только из уже загруженной строки списка.
