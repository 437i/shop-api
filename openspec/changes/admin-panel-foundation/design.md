# Design

## Context

См. proposal.md - Why для мотивации.

Frontend находится в начальной стадии: Vite + React настроены, зависимости установлены (React Router, TanStack Query, i18next, shadcn/ui), API-типы сгенерированы из `api/docs/swagger.yaml`. Структура директорий `src/app/`, `src/pages/`, `src/features/`, `src/entities/`, `src/shared/` создана, но файлы пустые.

Существующий стек: React 19, TypeScript 5.9, Vite 8, React Router 8, TanStack Query 5, i18next, Tailwind CSS 4, shadcn/ui, Vitest, Playwright.

Backend API работает в Docker на 127.0.0.1:8080. Vite dev server проксирует `/api/v1` на Go API. Java auth service отсутствует в docker-compose.yml, но Go API в текущей конфигурации запускается с dev-mock auth-модулем (`cmd/api/main.go` → `app.MockModule`): `POST /api/v1/auth` принимает любые валидные по форме credentials и возвращает фиксированный mock-токен, который принимает middleware защищённых endpoints. Это удобно для локальной проверки интеграции, но не является реальной аутентификацией; реальный auth flow появится после подключения Java auth service (`app.Module`).

## Goals / Non-Goals

**Goals:**
- Реализовать первый end-to-end пользовательский сценарий: вход → защищённая страница → список клиентов
- Создать архитектурный фундамент для последующих админ-функций: роутер, провайдеры, API-клиент, auth flow, layout
- Обеспечить type-safety через сгенерированные типы из Swagger
- Поддержать английский и русский языки
- Покрыть тестами критичные сценарии (unit + e2e)

**Non-Goals:**
- Фильтры и пагинация списка клиентов (следующая задача)
- Создание/редактирование/удаление клиентов
- Страницы Products и Suppliers
- Refresh token механизм
- Тёмная тема: ThemeProvider и переключатель темы не добавляются на этом этапе
- Поднятие Java auth service (backend, вне scope)

## Decisions

### 1. Архитектура слоёв

**Решение:** Сохранить существующую Feature-Sliced Design подобную структуру:
- `app/` — инициализация приложения (router, providers, layout, protected routes)
- `pages/` — страницы-контейнеры (LoginPage, ClientsListPage)
- `features/` — переиспользуемые фичи (пока пусто, будет использоваться позже)
- `entities/` — бизнес-сущности (пока пусто)
- `shared/` — общий код (api client, i18n, ui components)

**Альтернативы:**
- Flat структура: всё в `components/` и `pages/` — отвергнута, т.к. структура уже создана и подходит для роста проекта
- Полная FSD: добавление `widgets/`, `processes/` — избыточно на старте

**Обоснование:** Структура уже создана и соответствует стандартному подходу для React SPA среднего размера.

### 2. Роутинг

**Решение:** React Router 8 с data router API (`createBrowserRouter`, `RouterProvider`).

**Структура маршрутов:**
```
/ → redirect to /clients
/auth/login → LoginPage (публичный)
/clients → ClientsListPage (защищённый через ProtectedRoute, внутри AdminLayout)
* → NotFoundPage (404)
```

**Альтернативы:**
- Routes JSX API (`<BrowserRouter>`, `<Routes>`) — устаревший подход, не рекомендуется React Router 8

**Обоснование:** Data router — современный подход React Router, поддерживает будущие loader/action для server-side data fetching.

### 3. Провайдеры

**Решение:** Создать `app/providers.tsx` с композицией провайдеров:
1. `QueryClientProvider` (TanStack Query)
2. `I18nextProvider` (i18next)

Подключить в `main.tsx`, обернув `RouterProvider`.

**Конфигурация QueryClient:**
- `staleTime: 5 * 60 * 1000` (5 минут) — данные считаются свежими 5 минут
- `gcTime: 10 * 60 * 1000` (10 минут) — кеш очищается через 10 минут неиспользования
- `refetchOnWindowFocus: true` — автообновление при возврате на вкладку
- `retry: false` — не повторять запросы автоматически (ошибки обрабатываем явно)

**Альтернативы:**
- Отдельный Context для auth state — избыточно, т.к. токен в localStorage и проверяется в ProtectedRoute
- Redux/Zustand — не нужен, т.к. TanStack Query управляет server state, локальный UI state минимален

**Обоснование:** Минимальная конфигурация без over-engineering.

### 4. i18n

**Решение:** i18next с статическими JSON-ресурсами, импортируемыми в конфигурацию.

**Структура:**
- `src/shared/i18n/config.ts` — инициализация i18next
- `src/shared/i18n/locales/en/common.json` — английские переводы
- `src/shared/i18n/locales/ru/common.json` — русские переводы

**Namespaces:** Один namespace `common` на первом этапе (форма входа, навигация, ошибки, пустые состояния).

**Язык по умолчанию:** `en`. Переключение через `i18n.changeLanguage()`. Сохранение выбора языка — вручную через localStorage (чтение при инициализации, запись при смене языка), без дополнительных плагинов.

**Альтернативы:**
- HTTP backend для загрузки переводов — избыточно для небольшого количества ключей
- Отдельные namespaces для каждой страницы — преждевременная оптимизация

**Обоснование:** Статический импорт проще настроить и не требует дополнительных HTTP-запросов.

### 5. API Client

**Решение:** Единый типизированный HTTP-клиент `shared/api/client.ts` поверх fetch.

**Функции:**
- `apiClient.post<TRequest, TResponse>(path, body)` — POST с Bearer auth
- `apiClient.get<TResponse>(path, params?)` — GET с Bearer auth
- Автоматическое добавление `Authorization: Bearer <token>` из localStorage
- Обработка 401 от защищённых endpoints: удаление токена, очистка кеша TanStack Query, редирект на `/auth/login`; ошибки `/api/v1/auth` (включая 401) сессию не сбрасывают — см. решение 6
- Обработка других ошибок: parse ErrorResponse, throw typed error; для неожиданных статусов или ответов без поля `message` (например, `{"error": ...}` от middleware) формируется typed error с generic-сообщением
- Type-safe через сгенерированные типы из `shared/api/generated/schema.d.ts`

**Base URL:** `/api/v1` (проксируется Vite на Go API).

**Альтернативы:**
- Axios — дополнительная зависимость, fetch достаточен
- openapi-typescript-codegen с авто-генерацией клиента — избыточно, контракт простой
- Отдельные функции для каждого endpoint — дублирование auth logic

**Обоснование:** Fetch нативный, типизация через дженерики даёт type-safety без кодогенерации.

### 6. Аутентификация

**Решение:** JWT токен в localStorage под ключом `auth_token`. Токен используется как непрозрачная строка для Bearer авторизации.

**Flow:**
1. LoginPage отправляет `POST /api/v1/auth` с `{email, password}`
2. При 200 с непустым `token` → сохранение в localStorage → редирект на `/clients`
3. При 200 с пустым/отсутствующим `token` → ошибка "Authentication failed: no token received"
4. При 400/502 → отображение ErrorResponse.message

**ProtectedRoute:**
- Проверяет `localStorage.getItem('auth_token')`
- Если токен отсутствует → редирект на `/auth/login`
- Если токен есть → рендер children

**Глобальная обработка 401:**
- API client перехватывает 401 от защищённых endpoints
- Удаляет токен из localStorage
- Очищает кеш TanStack Query (`queryClient.clear()`)
- Редирект на `/auth/login`
- Механизм: API-клиент не импортирует `router` и `queryClient` напрямую — редирект и очистка кеша выполняются через инжектируемые колбэки, настраиваемые в `app/providers.tsx` (исключает циклические импорты)
- **Исключение:** любая ошибка самого `/api/v1/auth`, включая неожиданный 401, не инициирует logout и не удаляет существующий токен из localStorage

**Logout:**
- Удаление токена из localStorage
- Очистка кеша TanStack Query
- Редирект на `/auth/login`

**Альтернативы:**
- httpOnly cookies — требует изменений на backend (вне scope)
- Парсинг JWT payload (user id, roles) — не нужен на первом этапе, токен используется как opaque string
- Refresh token — отсутствует в API контракте

**Обоснование:** localStorage + Bearer — стандартный подход для SPA. XSS-риск митигируется на уровне CSP (backend).

### 7. AdminLayout и навигация

**Решение:** `app/AdminLayout.tsx` с shadcn/ui Sidebar.

**Компоненты:**
- Sidebar с пунктами: Clients (активный), Products (disabled), Suppliers (disabled)
- Language switcher (EN ↔ RU)
- Logout button

**Обоснование:** shadcn/ui уже установлен, предоставляет готовые accessible компоненты.

### 8. ClientsListPage состояния

**Решение:** TanStack Query `useQuery` с обработкой состояний:
- `isLoading: true` → Skeleton loader (5 строк)
- `isSuccess && data.length === 0` → Empty state ("No clients found")
- `isSuccess && data.length > 0` → Table с колонками: Name, Surname, Birthday, Gender, Registration Date
- `isError && error.status === 401` → обработано в API client (редирект)
- `isError && error.status !== 401` → shadcn/ui Alert с сообщением из ErrorResponse.message; если сообщение отсутствует или статус неожиданный — generic-сообщение об ошибке

**Альтернативы:**
- React.Suspense + ErrorBoundary — не подходит для отображения ошибок inline
- Отдельные boolean флаги (loading, error) — дублирует TanStack Query state

**Обоснование:** TanStack Query уже управляет состояниями, избегаем дублирования.

### 9. Форма входа

**Решение:** react-hook-form + zod для валидации; поля собираются на базе существующих shadcn/ui `input` и `label`.

**Правила валидации:**
- email — обязателен и должен быть валидным email
- password — обязателен (минимум 1 символ)

**Сообщения об ошибках:** тексты не хардкодятся в схеме, а резолвятся через i18n-ключи (например, `validation.emailRequired`, `validation.invalidEmail`, `validation.passwordRequired`) и отображаются с `useTranslation()` — это обеспечивает выполнение сценария «Русский язык».

**Обоснование:** react-hook-form уже установлен и не требует дополнительных зависимостей; компонент shadcn/ui `form` не установлен, поэтому используется связка Input + Label + react-hook-form. zod даёт type-safe схемы.

### 10. Тестирование

**Unit-тесты (Vitest):**
- LoginPage: форма, валидация, обработка ошибок (мокированный API через `vi.mock`/`vi.stubGlobal`, без новых зависимостей)
- API client: Bearer-заголовок, обработка 401
- ProtectedRoute: редирект при отсутствии токена

**E2E (Playwright):**
- Сценарий: mock login → clients list (с перехватом `/api/v1/auth` и `/api/v1/clients` через `page.route()`) → logout
- Сценарий: доступ к `/clients` без токена → редирект на login
- Сценарий: переключение языка EN ↔ RU меняет тексты интерфейса
- **Критично:** Playwright конфигурация отсутствует. Нужно создать `playwright.config.ts`, настроить `baseURL`, `webServer` (запуск Vite dev server), создать npm-скрипт `test:e2e`.

**Обоснование:** Unit-тесты для критичной логики, E2E для проверки интеграции. Моки в тестах, production-код чист от фиктивных данных.

## Risks / Trade-offs

### [Риск] JWT в localStorage уязвим к XSS атакам
**Митигация:**
- На уровне проекта: Content Security Policy настраивается на backend/nginx (вне scope этой задачи)
- Альтернатива (httpOnly cookies) требует изменений Go API
- Стандартный подход для SPA, принят как известный trade-off

### [Риск] Java auth service отсутствует — невозможно протестировать реальный auth flow
**Митигация:**
- Unit и E2E тесты используют моки
- Production-код не содержит заглушек, готов к интеграции
- Локальный сквозной сценарий можно проверить с dev-mock auth-модулем Go API (фиксированный mock-токен), но это проверка интеграции фронтенда, а не реальной аутентификации
- Документируем в задачах, что реальная проверка доступна только после поднятия Java service

### [Риск] Формат JWT payload неизвестен
**Митигация:**
- Токен используется как opaque string для Bearer авторизации
- Парсинг payload отложен до появления требований (например, отображение имени пользователя)

### [Риск] Отсутствие Playwright конфигурации
**Митигация:**
- Включить создание `playwright.config.ts` в задачи
- Документировать установку браузеров: `npx playwright install`

### [Trade-off] Нет пагинации на странице клиентов
**Обоснование:** Out of scope этой задачи. API поддерживает `limit` и `offset`, реализация в следующей задаче.

### [Trade-off] Один namespace для всех переводов
**Обоснование:** На старте достаточно. Можно разделить позже при росте количества ключей.

### [Trade-off] Disabled пункты меню (Products, Suppliers)
**Обоснование:** Страницы будут реализованы в отдельных задачах. Layout создаёт структуру навигации заранее.

## Migration Plan

Не применимо — это первая реализация, миграции нет. Deployment через обычный `npm run build` и размещение `dist/` на статическом хостинге или через nginx (уже настроен в проекте).

**Rollback:** Удалить изменения в `frontend/`, восстановить demo `App.tsx`.
