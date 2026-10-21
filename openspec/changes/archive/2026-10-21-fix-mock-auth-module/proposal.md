# Proposal

## Why

Заявленный в документации способ запустить Go API с dev-mock модулем аутентификации не работает: `auth.Mock` не реализует `ChangePassword` из интерфейса `auth.Service`, а `fx.As` проверяет реализацию интерфейса в рантайме — процесс падает при построении графа с `invalid fx.As: *auth.Mock does not implement auth.Service`. При этом документация утверждает обратное: `frontend/README.md` и шесть архивных изменений описывают dev-mock как рабочий и единственный способ локальной проверки, хотя Java auth service давно подключён (`docker-compose.yml` — сервисы `auth` и `auth-postgres`, `cmd/api` — `app.Module` с реальным gRPC-клиентом). В итоге dev-путь из README не запускается, а документация скрывает это и уводит читателя от фактического состояния стенда.

## What Changes

- `api/internal/auth/mock_grpc_client.go` — реализовать `ChangePassword` в `auth.Mock`, чтобы `app.MockModule` собирался, а dev-mock обслуживал все четыре auth-эндпоинта, включая `POST /api/v1/change`.
- `api/internal/app` — добавить тест, собирающий fx-граф из `mockAuthModule` (без `repoModule`, `infraModule` и `handlerModule`, то есть изолированно от инициализации БД и HTTP-сервера) и проверяющий, что мок удовлетворяет `auth.Service` и `auth.Validator`. Сейчас в `internal/auth` нет ни одного теста, поэтому дефект не ловится ни CI, ни локальной проверкой.
- `frontend/README.md` — переписать раздел «Local authentication (dev-mock)»: Java auth service подключён и является путём по умолчанию, dev-mock — опциональная альтернатива для работы без стенда.
- Архивные артефакты шести изменений — добавить датированное «Уточнение» о том, что утверждение о недоступности реальной аутентификации было верно на момент архивации и с тех пор неактуально. Исторический текст не переписывается.

Изменение **не является BREAKING**: HTTP-контракт, поведение основной конфигурации Go API, Java auth service и фронтенд не затрагиваются.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет. Изменение не меняет поведение продукта, HTTP-контракт и интерфейс фронтенда — оно чинит dev-инструмент и корректирует документацию. Поэтому в `.openspec.yaml` установлен `skip_specs: true`; требования не выдумываются ради валидации.

## Impact

**Код Go:**
- `api/internal/auth/mock_grpc_client.go` — метод `ChangePassword` у `Mock`.
- `api/internal/auth/mock_grpc_client_test.go` — новый unit-тест мока (в пакете `internal/auth` тестов пока нет).
- `api/internal/app/` — новый файл теста fx-графа из `mockAuthModule` (в пакете `internal/app` тестов пока нет; сам `app.go` не изменяется).

**Документация:**
- `frontend/README.md` — раздел «Local authentication (dev-mock)».
- `openspec/changes/archive/` — датированные уточнения в восемнадцати файлах, по три на архив (`proposal.md`, `design.md`, `tasks.md`): `2026-10-16-admin-panel-foundation`, `2026-10-18-clients-management`, `2026-10-18-products-list`, `2026-10-18-products-management`, `2026-10-18-supplier-delete-error-mapping`, `2026-10-18-suppliers-management`. Не затрагиваются `specs/**/spec.md` архивов: упоминания «auth service недоступен» в них относятся к сценарию контракта 503, а не к состоянию стенда.

**Используемые API-эндпоинты** (контракт не меняется; перечислены как поверхность, которую обслуживает dev-mock):
- `POST /api/v1/register` — регистрация, dev-mock возвращает фиксированный токен.
- `POST /api/v1/auth` — вход, dev-mock принимает любые корректно оформленные credentials.
- `POST /api/v1/reset` — сброс пароля, dev-mock отвечает без ошибки.
- `POST /api/v1/change` — смена пароля, dev-mock должен принимать mock-токен и завершаться успешно (сейчас метод отсутствует).

**Зависимости:** новых нет — `go.uber.org/fx v1.24.0` уже подключён. Frontend-зависимости не меняются.

**Не затрагивается:** Java auth service, `app.Module` (основная конфигурация Go API), Go HTTP API в рабочем стенде, код и тесты фронтенда, основные спецификации `openspec/specs/`.

**Незавершённые вопросы контракта и аутентификации:**
- Должен ли dev-mock отдавать фиксированный токен (значение — в `api/internal/auth/mock_grpc_client.go`) и для `POST /api/v1/change`? Да: middleware мока принимает только этот токен, поэтому смена пароля в dev-конфигурации обязана его принимать, иначе endpoint недостижим при любом токене.
- Какую ошибку возвращать при чужом токене? Реальный gRPC-клиент отображает `UNAUTHENTICATED` в `ErrWrongPassword` (HTTP 400, «invalid current password»); мок должен вести себя так же, иначе dev-конфигурация расходится с боевой по коду ответа.
- Не маскирует ли рабочий dev-mock реальную аутентификацию? Мок принимает любые credentials — это осознанное свойство dev-режима, и README обязан явно развести два пути, чтобы dev-проверка не выдавалась за проверку аутентификации.
