# Tasks

## 1. Общий модуль обратной связи

- [x] 1.1 Создать `src/shared/feedback/notifications.ts` — обёртку над `toast` из `sonner`, принимающую ключ i18n-строки и вызывающую `toast.success` с переведённым текстом (перевод выполняется через `i18n.t()` из singleton `@/shared/i18n/config`); проверить unit-тестом в `src/test/action-feedback.test.tsx`, что обёртка вызывает `toast.success` ровно один раз и с переводом указанного ключа
- [x] 1.2 Создать `src/shared/feedback/RetryableErrorAlert.tsx` — компонент `Alert variant="destructive"` с `AlertDescription` (текст ошибки) и кнопкой «Повторить», размещённой отдельной строкой под сообщением (без абсолютного позиционирования), принимающий колбэк повтора и признак выполнения повторной загрузки; проверить unit-тестами в `src/test/retryable-error-alert.test.tsx`, что текст ошибки и кнопка отображаются, нажатие вызывает колбэк, во время повтора кнопка заблокирована и показывает `feedback.retrying`, а кнопка рендерится отдельной строкой и не размещается в абсолютно позиционированном слоте `AlertAction`
- [x] 1.3 Смонтировать `<Toaster />` в `src/app/providers.tsx` внутри `QueryClientProvider`; проверить unit-тестом в `src/test/action-feedback.test.tsx`, что в дереве `Providers` присутствует ровно один контейнер уведомлений

## 2. Локализация текстов обратной связи

- [x] 2.1 Добавить в `src/shared/i18n/locales/en/common.json` и `src/shared/i18n/locales/ru/common.json` группу ключей `feedback` с ключами `retry`, `retrying`, `clientCreated`, `clientDeleted`, `clientAddressUpdated`, `supplierCreated`, `supplierDeleted`, `supplierAddressUpdated`, `productCreated`, `productDeleted`, `stockDecreased`; проверить unit-тестом в `src/test/i18n-feedback.test.tsx` паритет наборов ключей EN и RU и наличие всех 11 ключей в каждом файле
- [x] 2.2 Проверить, что компонент `RetryableErrorAlert` берёт подпись кнопки из ключа `feedback.retry`, подпись выполняемого повтора — из `feedback.retrying`, а тексты уведомлений — из группы `feedback`; проверить unit-тестами в `src/test/retryable-error-alert.test.tsx` и `src/test/action-feedback.test.tsx`, что подпись кнопки и текст уведомления меняются при смене языка интерфейса на русский

## 3. Уведомления об успешных мутациях

- [x] 3.1 В `src/pages/clients/useClientMutations.ts` добавить вызов уведомления в `onSuccess` хуков `useCreateClient`, `useDeleteClient`, `useUpdateClientAddress` с ключами `feedback.clientCreated`, `feedback.clientDeleted`, `feedback.clientAddressUpdated`; проверить unit-тестами в `src/test/clients-management.test.tsx`, что уведомление вызывается после успешного ответа, не вызывается при ошибках 400, 404, 500, 503, при сетевой ошибке и при ответе 401, и что две последовательные успешные мутации порождают два отдельных уведомления
- [x] 3.2 В `src/pages/products/useProductMutations.ts` добавить вызов уведомления в `onSuccess` хуков `useCreateProduct`, `useDeleteProduct`, `useDecreaseStock` с ключами `feedback.productCreated`, `feedback.productDeleted`, `feedback.stockDecreased`; проверить unit-тестами в `src/test/products-management.test.tsx` то же поведение, включая отсутствие уведомления при ответе 409
- [x] 3.3 В `src/pages/suppliers/useSupplierMutations.ts` добавить вызов уведомления в `onSuccess` хуков `useCreateSupplier`, `useDeleteSupplier`, `useUpdateSupplierAddress` с ключами `feedback.supplierCreated`, `feedback.supplierDeleted`, `feedback.supplierAddressUpdated`; проверить unit-тестами в `src/test/suppliers-management.test.tsx` то же поведение, включая отсутствие уведомления при ответе 400 `supplier is used by products`

## 4. Действие «Повторить» в состоянии ошибки списка

- [x] 4.1 В `src/pages/clients/ClientsListPage.tsx` заменить блок состояния ошибки на `RetryableErrorAlert` с колбэком `clientsQuery.refetch()`; проверить unit-тестами в `src/test/clients-list-page.test.tsx`, что действие отображается при ошибке загрузки, его нажатие вызывает повторный GET `/api/v1/clients`, после неуспешного повтора действие остаётся доступным для следующей попытки, а при ответе 401 действие не отображается
- [x] 4.2 В `src/pages/products/ProductsListPage.tsx` заменить блок состояния ошибки на `RetryableErrorAlert` с колбэком `productsQuery.refetch()`; проверить unit-тестами в `src/test/products-list-page.test.tsx` то же поведение для GET `/api/v1/products`
- [x] 4.3 В `src/pages/suppliers/SuppliersListPage.tsx` заменить блок состояния ошибки на `RetryableErrorAlert` с колбэком `suppliersQuery.refetch()`; проверить unit-тестами в `src/test/suppliers-list-page.test.tsx` то же поведение для GET `/api/v1/suppliers`

## 5. Сквозные проверки в браузере

- [x] 5.1 Расширить `frontend/e2e/helpers.ts` поддержкой сценария «первый GET списка возвращает ошибку, последующие — успех»; проверить, что новый параметр покрывает все три списка и не меняет поведение существующих e2e-сценариев
- [x] 5.2 Добавить e2e-сценарий в `frontend/e2e/action-feedback.spec.ts`: после ошибки загрузки списка клиентов нажатие «Повторить» приводит к отображению таблицы; проверить прохождение `npm run test:e2e`
- [x] 5.3 Добавить e2e-сценарии в `frontend/e2e/action-feedback.spec.ts`: успешное создание клиента показывает уведомление с текстом из группы `feedback`, и то же уведомление отображается на русском языке при выбранном языке интерфейса `ru`; проверить прохождение `npm run test:e2e`
- [x] 5.4 Добавить e2e-сценарий в `frontend/e2e/action-feedback.spec.ts`: при ответе 401 не появляется ни уведомление, ни действие «Повторить», выполняется переход на `/auth/login`; проверить прохождение `npm run test:e2e`
- [x] 5.5 Добавить e2e-проверку в `frontend/e2e/action-feedback.spec.ts`, что кнопка «Повторить» и текст сообщения об ошибке не перекрываются ни в локалях EN, ни в RU (сравнение `boundingBox()` в реальном браузере, поскольку jsdom не реализует layout); проверить прохождение `npm run test:e2e`

## 6. Итоговая проверка

- [x] 6.1 Выполнить `npm run check` в каталоге `frontend/` и убедиться, что typecheck, lint, unit-тесты и production-сборка проходят без ошибок
- [x] 6.2 Выполнить `openspec validate 2026-10-20-action-feedback-and-retry --strict` и убедиться, что замечаний нет
- [x] 6.3 Провести ручную проверку против локального backend: загрузка каждого из трёх разделов, успешная мутация с появившимся уведомлением, искусственная ошибка загрузки списка с работающим действием «Повторить»

## 7. Исправления по результатам аудита реализации

- [x] 7.1 В `src/pages/clients/ClientsListPage.tsx`, `src/pages/products/ProductsListPage.tsx` и `src/pages/suppliers/SuppliersListPage.tsx` исправить состояние ошибки во время повторной загрузки списка: React Query v5 при повторном запросе без данных переводит запрос в `pending` и очищает `error`, поэтому текст ошибки нужно удерживать вне состояния запроса, блок ошибки с действием «Повторить» должен оставаться смонтированным во время повтора, признак выполнения определять по факту выполнения запроса вместо `isRefetching` (для запроса без данных он всегда `false`), а кнопка — оставаться заблокированной и показывать локализованный текст `feedback.retrying`; после успешного повтора alert исчезает и отображается список; проверить unit-тестами в `src/test/clients-list-page.test.tsx`, `src/test/products-list-page.test.tsx` и `src/test/suppliers-list-page.test.tsx`, что при намеренно задержанном ответе списка alert и кнопка остаются видимыми, кнопка заблокирована и имеет текст `feedback.retrying`, а после успешного повтора alert отсутствует и отображается таблица
- [x] 7.2 Добавить e2e-регрессию в `frontend/e2e/action-feedback.spec.ts` на намеренно задержанный повторный запрос списка (при необходимости расширив `frontend/e2e/helpers.ts` параметром задержки ответа): во время запроса alert и действие «Повторить» остаются видимыми, кнопка заблокирована и показывает локализованный текст `feedback.retrying`, а после успешного ответа alert исчезает и отображается таблица; проверить прохождение `npm run test:e2e`

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
