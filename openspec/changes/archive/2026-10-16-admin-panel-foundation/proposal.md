# Proposal

## Why

Административный интерфейс React-приложения находится в начальной стадии: настроен tooling, установлены зависимости и сгенерированы API-типы, но отсутствует функциональность для работы пользователей. Необходимо реализовать первый работающий сценарий: вход → защищённая навигация → список клиентов. Это даёт пользователям доступ к данным и создаёт архитектурный фундамент для последующих административных функций.

## What Changes

- Настройка React Router с публичными и защищёнными маршрутами
- Настройка TanStack Query и i18next провайдеров
- Создание единого типизированного HTTP-клиента с Bearer-авторизацией
- Реализация страницы входа с формой (email, password)
- Интеграция с `POST /api/v1/auth` и хранение JWT-токена в localStorage
- Создание защищённого маршрута с проверкой токена
- Реализация административного layout с навигацией
- Реализация страницы списка клиентов с интеграцией `GET /api/v1/clients`
- Обработка состояний загрузки, успеха (пустой список и данные), ошибок (400, 401, 500, 502, 503)
- Поддержка английского языка (по умолчанию) и русского через переключатель
- Unit-тесты (Vitest) для критичных компонентов с мокированным API
- E2E-тесты (Playwright) для сценариев входа и защищённой навигации с перехватом API

## Capabilities

### New Capabilities

- `frontend/user-authentication`: Вход пользователя через форму с email и password, интеграция с `POST /api/v1/auth`, сохранение JWT-токена, обработка ошибок
- `frontend/protected-navigation`: Защита маршрутов через проверку токена, редирект на вход при отсутствии токена, выход с очисткой сессии
- `frontend/clients-list`: Отображение списка клиентов через интеграцию с `GET /api/v1/clients`, обработка состояний загрузки, пустого списка, успеха и ошибок

### Modified Capabilities

<!-- Нет изменений существующих capabilities -->

## Impact

**Затронутый код:**
- `frontend/src/app/` — новые `router.tsx`, `providers.tsx`, `AdminLayout.tsx`, `ProtectedRoute.tsx`
- `frontend/src/main.tsx` — подключение провайдеров вместо demo App.tsx
- `frontend/src/pages/auth/` — новая страница `LoginPage.tsx`
- `frontend/src/pages/clients/` — новая страница `ClientsListPage.tsx`
- `frontend/src/shared/api/` — новый `client.ts` с HTTP-клиентом
- `frontend/src/shared/i18n/` — новая конфигурация i18next и translation-файлы
- `frontend/src/test/` — новые unit-тесты
- `frontend/e2e/` — новые Playwright e2e-тесты и конфигурация

**API endpoints:**
- `POST /api/v1/auth` (LoginRequest → Response с token, статусы 200/400/502)
- `GET /api/v1/clients` (query-параметры name, surname, limit, offset → массив client.Response, статусы 200/400/500, 401/503 — ответы auth middleware, требует Bearer-авторизацию)

**Зависимости:**
- Использование установленных пакетов: react-router, @tanstack/react-query, i18next, react-i18next, react-hook-form, zod, shadcn/ui
- Playwright требует установку браузеров: `npx playwright install`

**Системы:**
- Go HTTP API — источник данных и авторизации (через Java gRPC auth service)
- **Ограничение:** Java auth service отсутствует в docker-compose.yml; Go API запускается с dev-mock auth-модулем (`cmd/api` → `app.MockModule`), поэтому `POST /api/v1/auth` локально отвечает 200 и выдаёт фиксированный mock-токен, а запросы к защищённым endpoints с этим токеном проходят middleware. Это не реальная аутентификация; 502 из контракта — поведение при недоступности реального auth service. Unit и E2E тесты используют моки. Production-код не содержит фиктивных данных.


> **Уточнение (2026-10-21).** Описанное выше — состояние на момент архивации: стенд использовал dev-mock auth, реальная аутентификация была недоступна. С тех пор `docker-compose` поднимает Java auth service (`auth`, `auth-postgres`), `cmd/api` запускает `app.Module` с реальным gRPC-клиентом, а dev-mock приведён в соответствие и остаётся опциональной альтернативой; поэтому приведённые выше утверждения о недоступности реального auth service, об актуальности `frontend/README.md` и о работе раздела только при dev-mock auth не описывают текущий стенд — см. `frontend/README.md`, раздел «Local authentication».

**Незавершённые вопросы:**
- Формат и содержимое JWT-токена не документированы в Swagger. Токен используется как непрозрачная строка для Bearer-авторизации без парсинга payload.
- Refresh token механизм отсутствует в контракте. Реализация ограничена access token в localStorage.
