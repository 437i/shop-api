# Tasks

## 1. Инфраструктура: i18n и провайдеры

- [x] 1.1 Создать `src/shared/i18n/locales/en/common.json` с переводами для формы входа, навигации, ошибок и пустых состояний, проверить наличие файла
- [x] 1.2 Создать `src/shared/i18n/locales/ru/common.json` с русскими переводами тех же ключей, проверить наличие файла
- [x] 1.3 Создать `src/shared/i18n/config.ts` с инициализацией i18next (язык по умолчанию `en`, поддержка `ru`, сохранение выбора языка в localStorage вручную, без дополнительных плагинов), проверить что конфигурация экспортирует инициализированный инстанс i18n
- [x] 1.4 Создать `src/app/providers.tsx` с QueryClientProvider (staleTime: 5 мин, gcTime: 10 мин, refetchOnWindowFocus: true, retry: false) и I18nextProvider, проверить что компонент экспортируется
- [x] 1.5 Обновить `src/main.tsx`: обернуть текущий рендер приложения в Providers, проверить что приложение компилируется без ошибок (`npm run typecheck`)

## 2. API Client

- [x] 2.1 Создать `src/shared/api/client.ts` с типизированными функциями `apiClient.post<TRequest, TResponse>(path, body)` и `apiClient.get<TResponse>(path, params?)`, проверить что файл экспортирует apiClient
- [x] 2.2 Реализовать автоматическое добавление `Authorization: Bearer <token>` из `localStorage.getItem('auth_token')` для всех запросов, проверить что функция добавления заголовка покрыта unit-тестом
- [x] 2.3 Реализовать обработку ответа 401: удаление токена из localStorage, очистка QueryClient кеша, редирект на `/auth/login` (только для защищённых endpoints, исключая сам `/api/v1/auth`), проверить что логика покрыта unit-тестом
- [x] 2.4 Реализовать парсинг ErrorResponse (`{message?: string}`) и throw typed error для статусов 400, 500, 502, 503, проверить что обработка ошибок покрыта unit-тестом
- [x] 2.5 Написать unit-тесты для API client (Bearer-заголовок, 401 защищённого запроса сбрасывает сессию, 401 от `/api/v1/auth` не сбрасывает сессию, обработка ErrorResponse), проверить что тесты проходят (`npm run test`)

## 3. Router и Protected Route

- [x] 3.1 Создать `src/app/ProtectedRoute.tsx`: компонент проверяет наличие токена в localStorage, при отсутствии перенаправляет на `/auth/login`, при наличии рендерит children, проверить что компонент экспортируется
- [x] 3.2 Создать `src/app/router.tsx` с `createBrowserRouter`: маршруты `/auth/login` (публичный), `/` (редирект на `/clients`), `/clients` (защищённый через ProtectedRoute), `*` (NotFoundPage), проверить что router экспортируется
- [x] 3.3 Создать заглушку `src/pages/NotFoundPage.tsx` с текстом "404: Page Not Found" и ссылкой на главную, проверить что страница рендерится
- [x] 3.4 Обновить `src/main.tsx`: заменить demo App на `<RouterProvider router={router} />` внутри Providers, удалить импорт demo App.tsx, проверить что приложение компилируется и запускается (`npm run dev`)
- [x] 3.5 Написать unit-тесты для ProtectedRoute и роутера: редирект при отсутствии токена, рендер children при наличии токена, отображение NotFoundPage для неизвестного маршрута, проверить что тесты проходят (`npm run test`)

## 4. Форма входа

- [x] 4.1 Создать `src/pages/auth/LoginPage.tsx` с формой (react-hook-form + zod): поля email (type="email", required) и password (type="password", required), кнопка "Sign In", проверить что страница рендерится
- [x] 4.2 Настроить zod-схему валидации: email обязателен и должен быть валидным email, password обязателен (минимум 1 символ), проверить что схема экспортируется
- [x] 4.3 Реализовать TanStack Query mutation для `POST /api/v1/auth` с телом `{email, password}` через apiClient.post, проверить что mutation определена
- [x] 4.4 Реализовать обработку успешного ответа: если `token` непустой → сохранение в localStorage под ключом `auth_token` → редирект на `/clients`, если `token` пустой/отсутствует → ошибка "Authentication failed: no token received", проверить что логика реализована
- [x] 4.5 Реализовать отображение состояния загрузки: кнопка становится disabled, текст меняется на "Signing in...", проверить что состояние отображается
- [x] 4.6 Реализовать отображение ошибок: при 400/502 показать `ErrorResponse.message` или fallback "Invalid credentials"/"Authentication service unavailable", при сетевой ошибке "Network error. Please try again.", проверить что ошибки отображаются
- [x] 4.7 Реализовать редирект авторизованного пользователя: если токен уже есть в localStorage при загрузке `/auth/login` → редирект на `/clients`, проверить что редирект работает
- [x] 4.8 Добавить локализацию формы: labels, placeholder, кнопка, ошибки используют `useTranslation()` из react-i18next, проверить что тексты переводятся при переключении языка
- [x] 4.9 Написать unit-тесты для LoginPage: валидация формы, обработка успешного ответа с токеном, обработка успешного ответа без токена, обработка ошибок 400/502, редирект при наличии токена в localStorage при открытии `/auth/login`, мокированный API через vi.mock, проверить что тесты проходят (`npm run test`)

## 5. Admin Layout и навигация

- [x] 5.1 Создать `src/app/AdminLayout.tsx` с shadcn/ui Sidebar: пункты меню "Clients" (активный), "Products" (disabled), "Suppliers" (disabled), проверить что layout рендерится
- [x] 5.2 Добавить переключатель языка в layout: кнопка с текущим языком (EN/RU), при клике вызывает `i18n.changeLanguage()`, проверить что переключение меняет тексты интерфейса
- [x] 5.3 Добавить кнопку "Logout" в layout: при клике удаляет токен из localStorage, очищает QueryClient кеш (`queryClient.clear()`), перенаправляет на `/auth/login`, проверить что logout работает
- [x] 5.4 Добавить локализацию навигации: названия пунктов меню, кнопка выхода используют переводы, проверить что тексты переводятся
- [x] 5.5 Интегрировать AdminLayout в router: обернуть маршрут `/clients` в `<AdminLayout><Outlet /></AdminLayout>`, проверить что layout отображается вокруг защищённых страниц

## 6. Страница списка клиентов

- [x] 6.1 Создать `src/pages/clients/ClientsListPage.tsx` с TanStack Query `useQuery` для `GET /api/v1/clients` через apiClient.get, проверить что страница рендерится
- [x] 6.2 Реализовать состояние загрузки: при `isLoading === true` отображать Skeleton loader (5 строк с заглушками колонок), проверить что skeleton отображается
- [x] 6.3 Реализовать состояние пустого списка: при `isSuccess && data.length === 0` отображать "No clients found" с иллюстрацией, проверить что empty state отображается
- [x] 6.4 Реализовать отображение таблицы: при `isSuccess && data.length > 0` отображать shadcn/ui Table с колонками Name, Surname, Birthday (формат YYYY-MM-DD), Gender, Registration Date (формат YYYY-MM-DD HH:mm), используя поля из `internal_client.Response[]`, проверить что таблица рендерится с данными
- [x] 6.5 Реализовать обработку ошибок: при `isError && error.status === 400` отображать Alert с `ErrorResponse.message` или fallback "Invalid request", при 500/503 — с `ErrorResponse.message` или fallback "Server error. Please try again later.", при сетевой ошибке "Network error. Please try again.", проверить что ошибки отображаются
- [x] 6.6 Добавить локализацию таблицы: заголовки колонок, сообщения об ошибках, empty state используют переводы, проверить что тексты переводятся
- [x] 6.7 Написать unit-тесты для ClientsListPage: skeleton при загрузке, empty state при пустом массиве, таблица при данных, ошибки при 400/500/503, 401 (очистка сессии и редирект на `/auth/login`), повторное монтирование в течение staleTime отдаёт данные из кеша без нового запроса, мокированный API, проверить что тесты проходят (`npm run test`)
- [x] 6.8 Добавить компонент `alert` из shadcn/ui (`npx shadcn@latest add alert`), проверить что `src/components/ui/alert.tsx` создан и используется для сообщений об ошибках

## 7. E2E тестирование

- [ ] 7.1 Создать `playwright.config.ts`: настроить `baseURL: 'http://127.0.0.1:5173'` (совпадает с `server.host` из `vite.config.ts`), `webServer` для запуска `npm run dev` с ожиданием `http://127.0.0.1:5173`, `testDir: './e2e'`, проверить что `npx playwright test --list` выполняется без ошибок конфигурации
- [ ] 7.2 Добавить npm-скрипт `"test:e2e": "playwright test"` в package.json, проверить что скрипт добавлен
- [ ] 7.3 Создать `e2e/auth.spec.ts`: тест "should login with mocked API and navigate to clients", использовать `page.route()` для перехвата `/api/v1/auth` (возврат mock token) и `/api/v1/clients` (возврат mock массива клиентов), проверить что после входа отображается таблица клиентов и пункты меню "Products" и "Suppliers" отображаются как disabled, проверить что тест проходит (`npm run test:e2e`)
- [ ] 7.4 Создать тест "should redirect to login when accessing protected route without token": открыть `/clients` без токена в localStorage, проверить редирект на `/auth/login`, проверить что тест проходит (`npm run test:e2e`)
- [ ] 7.5 Создать тест "should logout and redirect to login": после mock login перейти на `/clients`, нажать кнопку Logout, проверить редирект на `/auth/login` и отсутствие токена в localStorage, проверить что тест проходит (`npm run test:e2e`)
- [ ] 7.6 Создать тест "should switch language": проверить что переключатель языка меняет тексты интерфейса с английского на русский и обратно, проверить что тест проходит (`npm run test:e2e`)
- [ ] 7.7 Документировать установку Playwright браузеров в README или комментарии: добавить инструкцию `npx playwright install`, проверить что инструкция добавлена
- [ ] 7.8 Исключить e2e-спеки из Vitest: добавить в `vite.config.ts` `test.exclude` для `e2e/**` (или `include` только `src/**`), проверить что `npm run test` не собирает Playwright-тесты

## 8. Финальная проверка

- [ ] 8.1 Удалить demo `src/App.tsx` и `src/App.css`, проверить что файлы удалены и приложение компилируется
- [ ] 8.2 Запустить `npm run typecheck`, проверить что TypeScript проходит без ошибок
- [ ] 8.3 Запустить `npm run lint`, проверить что линтер проходит без ошибок
- [ ] 8.4 Запустить `npm run test`, проверить что все unit-тесты проходят
- [ ] 8.5 Запустить `npm run build`, проверить что production сборка успешна
- [ ] 8.6 Запустить `npm run test:e2e`, проверить что все E2E тесты проходят
- [ ] 8.7 Проверить вручную в браузере: вход через dev-mock auth-модуль Go API (mock-токен), переключение языка, защищённый маршрут, список клиентов через локальный API, logout; обработку ошибок 400/502 проверить перехватом/подменой ответа (DevTools), документировать результат проверки
- [ ] 8.8 Документировать ограничение: реальная аутентификация недоступна до подключения Java auth service; локально Go API использует dev-mock auth-модуль (вход выдаёт фиксированный mock-токен), поэтому вход не подтверждает реальную аутентификацию; добавить комментарий в код или README, проверить что документация добавлена
