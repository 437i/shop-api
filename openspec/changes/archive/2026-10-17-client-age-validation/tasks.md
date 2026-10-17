# Tasks

## 1. Календарная проверка возраста в Go API

- [x] 1.1 Переписать `validateBirthday` в `api/internal/client/service.go` на сигнатуру `validateBirthday(bday, now time.Time) error` с вычислением возраста по компонентам даты UTC (`now.UTC()`): future → `ErrTimeTravel`, возраст > 100 → `ErrTooOld`, возраст < 16 → `ErrTooYoung`; `Create` передаёт `time.Now()`; `errors.go`, `handler.go`, DTO и маршруты не меняются; проверить `go build ./...` и `go vet ./...` в `api/`
- [x] 1.2 Добавить табличные тесты границ в `api/internal/client/service_test.go` (today `2026-10-16` UTC): `2010-10-17` → `ErrTooYoung`, `2010-10-16` → ok (ровно 16), `2009-10-16` → ok, `1926-10-16` → ok (ровно 100), `1925-10-17` → ok (100), `1925-10-16` → `ErrTooOld`, плюс по одному дню по обе стороны от обеих границ; future `2026-10-17` → `ErrTimeTravel`, дата равная today → не future и `ErrTooYoung`; проверить `go test ./internal/client/ -run TestValidateBirthday`
- [x] 1.3 Добавить тесты детерминированности в `api/internal/client/service_test.go`: одни сутки UTC в `00:00:01` и `23:59:59` дают одинаковые вердикты; один момент в разных `time.FixedZone` даёт одинаковые вердикты; проверить `go test ./internal/client/`
- [x] 1.4 Добавить тесты 29.02 в `api/internal/client/service_test.go`: born `2000-02-29` при `2016-02-28` → `ErrTooYoung`, при `2016-02-29` и `2016-03-01` → ok; born `1924-02-29` при `2025-02-28` → ok (100), при `2025-03-01` → `ErrTooOld`; дискриминирующий кейс born `1915-03-01` при `2016-02-29` → ok (100); проверить `go test ./internal/client/`
- [x] 1.5 Удалить неиспользуемое поле `wantComment` из таблицы `TestValidateBirthday` в `api/internal/client/service_test.go` (находка аудита OS-001); проверить `go test ./internal/client/` и `gofmt -l internal/client/`

## 2. Регрессия существующего создания клиента

- [x] 2.1 Добавить `api/internal/client/mapper_test.go`: `DTOToModel` парсит `2000-02-29` в UTC-полночь и возвращает `ErrInvalidBirthday` для `2026-02-30`; проверить `go test ./internal/client/`
- [x] 2.2 Добавить тест `Create` с ручными фейками `Repository`, `address.Repository`, `database.Transactor`: валидная дата доходит до репозитория (вызовы зафиксированы, клиент и адрес возвращены), невалидный возраст прерывает выполнение до транзакции, `errors.Is` сохраняется после обёртки; проверить `go test ./internal/client/ -run TestCreate`
- [x] 2.3 Добавить `api/internal/client/errors_test.go`: проверить реальный маппинг `MapErrToHTTP` (`api/internal/client/errors.go`) для `ErrTooYoung`, `ErrTooOld`, `ErrTimeTravel` — HTTP 400 и точные тексты `client can't be younger than 16 years`, `client can't be older than 100 years`, `time travellers not welcome`; handler-проверка `POST /clients` через тестовый gin-роутер с фейковым `Service`, возвращающим ошибку в обёртке реального сервиса (`validate bday: %w`): статус 400 и тело `ErrorResponse` с полем `message`, содержащим точный текст причины; `errors.go` и `handler.go` не изменяются; проверить `go test ./internal/client/`
- [x] 2.4 Добавить `api/internal/client/handler_test.go` (находка аудита OS-003): успешное создание `POST /clients` через тестовый gin-роутер с фейковым `Service`, возвращающим созданного клиента и адрес, — статус 201 и существующее тело `Response`; проверить `go test ./internal/client/`

## 3. Итоговая верификация

- [x] 3.1 Запустить `go test ./...`, `go vet ./...` и `gofmt -l .` в `api/`, проверить отсутствие ошибок и неотформатированных файлов
- [x] 3.2 Запустить `openspec validate client-age-validation --strict`, проверить успешную валидацию артефактов

## Workflow follow-up

- После выполнения 1.5 и 2.4 повторно выполнить итоговую верификацию (3.1, 3.2) перед архивацией.
- После ревью и завершения всех проверок заархивировать изменение (openspec archive).
- Выравнивание frontend-валидации и frontend-спеки на UTC-политику выполняется в изменении `clients-management` (группа 8) и не входит в это изменение.
