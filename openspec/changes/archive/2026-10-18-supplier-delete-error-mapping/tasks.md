# Tasks

## 1. Маппинг SQLSTATE при удалении поставщика

- [x] 1.1 В `api/internal/supplier/pg_repository.go` выделить неэкспортируемую функцию `mapDeleteError(err error) error`: для `*pgconn.PgError` с кодом `pgerrcode.ForeignKeyViolation` (`23503`) или `pgerrcode.RestrictViolation` (`23001`) возвращает `ErrSupplierInUse`, для прочих ошибок — прежнее `fmt.Errorf("execute delete query: %w", err)`; `Delete` вызывает её вместо inline-проверки; `errors.go`, `service.go`, `handler.go`, публичные интерфейсы и тексты ошибок не изменяются; проверить `go build ./...` в `api/` и что `git diff --name-only` не содержит других файлов пакета `supplier` за пределами этого изменения
- [x] 1.2 Добавить `api/internal/supplier/pg_repository_test.go` с табличными тестами `mapDeleteError`: коды `23001` и `23503` (прямые и обёрнутые через `%w`) дают `errors.Is(err, ErrSupplierInUse)`; `23505`, `*pgconn.PgError` с пустым кодом, ошибка без `pgconn.PgError` и обёрнутая такая ошибка — `errors.Is` ложно и текст содержит `execute delete query`; проверить `go test ./internal/supplier/ -run TestMapDeleteError` в `api/`
- [x] 1.3 Добавить `api/internal/supplier/handler_test.go` с фейковым `Service` (паттерн `api/internal/client/handler_test.go`): `DELETE /suppliers/{id}` при `ErrSupplierInUse` от сервиса → HTTP 400 и тело `ErrorResponse` с точным сообщением `supplier is used by products`; при прочей ошибке сервиса → HTTP 500 `internal server error`; при `ErrNotFound` от сервиса → HTTP 404 и тело `ErrorResponse` с сообщением `supplier not found`; при успехе → HTTP 204 без тела; при некорректном UUID → HTTP 400 `invalid supplier id` без вызова сервиса; проверить `go test ./internal/supplier/` в `api/`

## 2. Проверка реального сценария на PostgreSQL 18

- [x] 2.1 Пересобрать и поднять локальный стек с текущим кодом: `docker compose build api && docker compose up -d --wait` из корня репозитория (PostgreSQL 18, миграции, Go API с dev-mock auth по `frontend/README.md`; без пересборки уже запущенный стек продолжит отдавать старый бинарник API); дождаться статуса healthy; получить dev-mock токен (`POST http://127.0.0.1:8080/api/v1/auth`; значение токена при выполнении брать из `api/internal/auth/mock_grpc_client.go` и не переносить в артефакты); убедиться, что `GET http://127.0.0.1:8080/api/v1/suppliers` с токеном возвращает 200, а без токена — 401, и что `DELETE http://127.0.0.1:8080/api/v1/suppliers/{id}` без токена возвращает 401 от middleware до обработки handler (id может быть любым UUID)
- [x] 2.2 Провести сценарий: `POST /api/v1/suppliers` → 201; `POST /api/v1/products` с полями `name`, `category.name`, `price`, `available_stock`, `supplier_id` → 201; `DELETE /api/v1/suppliers/{id}` → ожидается HTTP 400 с сообщением `supplier is used by products`; `GET /api/v1/suppliers/{id}` и `GET /api/v1/products/{id}` подтверждают, что поставщик и товар не изменились; очистка: `DELETE /api/v1/products/{id}` → 204, `DELETE /api/v1/suppliers/{id}` → 204, `GET /api/v1/suppliers/{id}` → 404
- [x] 2.3 Записать в раздел «Результаты проверок» этого файла: дату, среду (PostgreSQL 18, локальный стек), фактические статусы и сообщения шагов 2.1–2.2 и итог проверки

## 3. Итоговая верификация

- [x] 3.1 Запустить `go test ./...`, `go vet ./...` и `gofmt -l .` в `api/`, убедиться в отсутствии ошибок и неотформатированных файлов
- [x] 3.2 Запустить `openspec validate supplier-delete-error-mapping --strict` и убедиться в успешной валидации артефактов

## Результаты проверок

- 2.1–2.2: 2026-10-18 11:29, локальный стек (docker compose build api && docker compose up -d --wait; контейнер `be3-api` пересоздан и healthy, PostgreSQL 18). Логин `POST /api/v1/auth` → 200, dev-mock токен получен (значение не фиксируется). `GET /api/v1/suppliers` с токеном → 200; без токена → 401 `{"error":"missing or invalid authorization header"}`; `DELETE /api/v1/suppliers/{uuid}` без токена → 401 (тот же ответ middleware). Сценарий: `POST /api/v1/suppliers` → 201 (телефон нормализован до `+79991234567`); `POST /api/v1/products` (товар Delete Check Fridge, категория Delete Check) → 201; `DELETE /api/v1/suppliers/{id}` → 400 `{"message":"supplier is used by products"}` (дефект 500 на PostgreSQL 18 устранён); `GET /api/v1/suppliers/{id}` → 200 и `GET /api/v1/products/{id}` → 200 (данные не изменились); очистка: `DELETE /api/v1/products/{id}` → 204, `DELETE /api/v1/suppliers/{id}` → 204, `GET /api/v1/suppliers/{id}` → 404 `{"message":"supplier not found"}`. Итог: пройдено полностью.
- 3.1–3.2: 2026-10-18 11:29, `go test ./...` — все пакеты ok (`be2/internal/supplier` PASS, exit 0); `go vet ./...` — без замечаний (exit 0); `gofmt -l .` — пусто; `openspec validate supplier-delete-error-mapping --strict` — Change is valid (exit 0). Итог: пройдено полностью.

## Workflow follow-up

- Не архивировать изменение, пока не пройдены задачи групп 1–3.
- После успешной проверки 2.2 при отдельном решении обновить запись сценария in-use в задаче 6.3 изменения `suppliers-management` (её результат фиксирует дефект, который устраняет это изменение) — это действие вне рамок текущего изменения.
- После ревью заархивировать изменение (`openspec archive supplier-delete-error-mapping`); при архивации проверить, что основная спецификация `backend/suppliers-management` создана с корректным Purpose и delta-спецификация перенесена без потерь.
