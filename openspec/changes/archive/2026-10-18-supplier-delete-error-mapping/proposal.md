# Proposal

## Why

При ручной проверке изменения `suppliers-management` против реального PostgreSQL удаление поставщика, на которого ссылается товар, вернуло HTTP 500 `internal server error` вместо предусмотренного контрактом HTTP 400 `supplier is used by products`. PostgreSQL 18 для нарушения `ON DELETE RESTRICT` возвращает SQLSTATE `23001` (`restrict_violation`), а `api/internal/supplier/pg_repository.go` распознаёт только `23503` (`foreign_key_violation`), поэтому администратор видит неинформативную ошибку сервера вместо причины отказа.

## What Changes

- В `api/internal/supplier/pg_repository.go` при ошибке `DELETE` распознавать оба SQLSTATE — `23001` (`pgerrcode.RestrictViolation`, PostgreSQL 18+) и `23503` (`pgerrcode.ForeignKeyViolation`, PostgreSQL 17 и раньше) — и возвращать существующую доменную ошибку `ErrSupplierInUse`.
- Сохранить текущее поведение для остальных ошибок БД: они по-прежнему оборачиваются как `execute delete query: ...` и обрабатываются как HTTP 500 `internal server error`.
- Выделить проверку SQLSTATE в небольшую неэкспортируемую функцию в том же файле, чтобы покрыть оба кода unit-тестами без реальной БД; поведение и публичные интерфейсы не меняются.
- Добавить табличные unit-тесты для `23001` и `23503` (прямых и обёрнутых ошибок), прочих SQLSTATE и ошибок, не являющихся `*pgconn.PgError`.
- Добавить тест HTTP-контракта на уровне handler с фейковым сервисом: `ErrSupplierInUse` → HTTP 400 с сообщением `supplier is used by products`; несвязанная ошибка → HTTP 500 `internal server error`.
- Выполнить проверку реального сценария на локальном стеке PostgreSQL 18: поставщик используется товаром, `DELETE /api/v1/suppliers/{id}` возвращает HTTP 400 с ожидаемым сообщением, поставщик и товар остаются в корректном состоянии.

**Вне scope (не изменяется):** HTTP-контракт, Swagger (`api/docs/swagger.yaml`), DTO, маршруты, схема БД и миграции, frontend. Существующая обработка `23503` сохраняется; другие backend-операции не затрагиваются: маппинг FK-нарушения при создании товара (`product.Create`, `api/internal/product/pg_repository.go:77` → `ErrSupplierNotFound`) и отсутствие разбора FK-ошибок в `product.Delete` остаются как есть.

## Capabilities

### New Capabilities

- `backend/suppliers-management`: серверная обработка удаления поставщика — классификация нарушения ограничения `products.supplier_id` (SQLSTATE `23001` и `23503`) как HTTP 400 `supplier is used by products` и сохранение существующего контракта для успешного удаления, отсутствующего поставщика и прочих ошибок БД.

### Modified Capabilities

Нет: существующие спецификации не меняются; поведение `DELETE /api/v1/suppliers/{id}` ранее не было описано в основной спецификации.

## Impact

**Затронутый код:**
- `api/internal/supplier/pg_repository.go` — расширение проверки SQLSTATE в `Delete`, выделение неэкспортируемой функции маппинга ошибки удаления.
- `api/internal/supplier/pg_repository_test.go` — новый файл с unit-тестами маппинга SQLSTATE.
- `api/internal/supplier/handler_test.go` — новый тест HTTP-контракта удаления с фейковым сервисом.

**API endpoints:**
- `DELETE /api/v1/suppliers/{id}` (Bearer) → 204; 400 (`supplier is used by products`); 404 (`supplier not found`); 500 — контракт из `api/docs/swagger.yaml` не меняется.
- Для ручной проверки используются существующие endpoints: `POST /api/v1/suppliers` (201), `POST /api/v1/products` (201), `GET /api/v1/suppliers/{id}`, `GET /api/v1/products/{id}`, `DELETE /api/v1/products/{id}` (204). Они не изменяются.

**Зависимости:**
- Новых зависимостей нет: константа `pgerrcode.RestrictViolation` (`23001`) уже присутствует в закреплённой версии `github.com/jackc/pgerrcode`.
- Новые инструменты тестирования и testcontainers не добавляются: unit-тесты используют стандартную библиотеку и `pgconn.PgError`; реальный сценарий проверяется вручную на локальном стеке, как в `suppliers-management` (задача 6.3).

**Системы:**
- Go HTTP API и PostgreSQL 18 из `docker-compose.yml`; frontend, nginx и Java auth service не затрагиваются.

**Незавершённые вопросы:**
- Контракт и аутентификация не меняются: маршрут, статусы, формат `ErrorResponse` и Bearer-защита сохраняются; dev-mock auth используется только для локальной проверки.
- Блокирующих вопросов нет. Принятое допущение: автоматизированный интеграционный тест с реальной БД не добавляется, поскольку в проекте отсутствует инфраструктура таких тестов, а новые зависимости не оправданы; реальный сценарий фиксируется ручной проверкой по шагам задачи.
