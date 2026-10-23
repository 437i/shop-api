# Tasks

## 1. Данные карточки

- [x] 1.1 В `frontend/src/pages/suppliers/` создать `useSupplierDetails.ts`: функция `getSupplier` отправляет `GET /api/v1/suppliers/{id}` с Bearer-авторизацией через общий HTTP-клиент, ответ 404 возвращает `null` (шаблон `getProduct` в `useProductDetails.ts`), остальные ошибки пробрасываются; хук `useSupplierDetails(id)` использует `useQuery` с ключом `["supplier", id]` и глобальными правилами кеша панели
- [x] 1.2 Создать `frontend/src/test/use-supplier-details.test.tsx` с проверками: запрос с Bearer-токеном из localStorage; ключ кеша `["supplier", id]`; ответ 404 даёт данные `null` без состояния ошибки; ответы 400 и 500 и сетевая ошибка дают состояние ошибки; проверить, что `npx vitest run src/test/use-supplier-details.test.tsx` проходит

## 2. Данные карточки после мутаций из списка

- [x] 2.1 В `frontend/src/pages/suppliers/useSupplierMutations.ts` экспортировать `SUPPLIER_QUERY_KEY = ["supplier"]` и добавить после успеха `useUpdateSupplierAddress` и `useDeleteSupplier` инвалидацию `invalidateQueries({ queryKey: SUPPLIER_QUERY_KEY })` рядом с существующей инвалидацией `["suppliers"]`; добавить юнит-тесты, фиксирующие: после изменения адреса и после удаления поставщика кеш `["supplier", id]` отмечен устаревшим и повторное открытие карточки отправляет `GET /api/v1/suppliers/{id}` заново, а кеши товара (`["product"]`, `["product-image"]`) и список поставщиков `["suppliers"]` не задеваются лишний раз; проверить, что `npx vitest run src/test/suppliers-management.test.tsx` проходит

## 3. Страница карточки поставщика

- [x] 3.1 Создать `frontend/src/pages/suppliers/SupplierDetailsPage.tsx`: skeleton при загрузке; карточка на shadcn `Card` с полями `name`, `phone_number` и блоком адреса `address.country`, `address.city`, `address.street`; состояние отсутствия поставщика при 404 или `null` данных с локализованным сообщением и действием возврата к `/suppliers`; Alert ошибок 400/500/503/сети с сообщением сервера либо локализованным откатом и действием «Повторить», повторяющим `GET /api/v1/suppliers/{id}`; локальный резолвер ошибок по шаблону `ProductDetailsPage`; действия карточки — только возврат; убедиться, что `npm run typecheck` в `frontend/` проходит
- [x] 3.2 Создать `frontend/src/test/supplier-details-page.test.tsx` с проверками: запрос карточки с Bearer-токеном; skeleton до завершения; отображение всех полей карточки и блока адреса; отсутствие поставщика после 404, включая сценарий «после удаления поставщика из списка кеш карточки инвалидируется по 2.1, повторное открытие карточки показывает состояние отсутствия»; ответы 400 и 500 с сообщением сервера, 500 без `message` и 503 независимо от тела ответа с локализованным откатом и сетевая ошибка, каждая с действием «Повторить»; 401 не показывает сообщение и завершает сессию глобальным обработчиком; повторное открытие карточки того же поставщика в пределах staleTime не отправляет новый запрос; возврат к списку; на карточке нет действий изменения имени, телефона или адреса; проверить, что `npx vitest run src/test/supplier-details-page.test.tsx` проходит
- [x] 3.3 Добавить ключи локализации карточки (заголовки полей, блок адреса, состояния, ошибки, действия, сообщение отсутствия поставщика) в `frontend/src/shared/i18n/locales/en/common.json` и `frontend/src/shared/i18n/locales/ru/common.json`; проверить, что наборы ключей английской и русской локалей совпадают, а `npx vitest run src/test/i18n-feedback.test.tsx` проходит

## 4. Маршрут и переход из списка

- [x] 4.1 В `frontend/src/app/router.tsx` добавить защищённый маршрут `/suppliers/:id` с элементом страницы карточки внутри существующего блока `ProtectedRoute` + `AdminLayout`; дополнить `frontend/src/test/routing.test.tsx` проверками: маршрут требует токен, авторизованный пользователь видит страницу карточки, неизвестный маршрут по-прежнему ведёт на `NotFoundPage`; проверить, что `npx vitest run src/test/routing.test.tsx` проходит
- [x] 4.2 В `frontend/src/pages/suppliers/SuppliersListPage.tsx` добавить в меню действий строки первым пунктом действие перехода к карточке («Details» / «Карточка»), выполняющее `navigate(`/suppliers/${id}`)`; остальное меню строки (изменение адреса, удаление) не меняется; дополнить `frontend/src/test/suppliers-list-page.test.tsx` проверками: пункт отображается в меню каждой строки, активация открывает `/suppliers/{id}` этого поставщика; уточнить ожидания меню в `frontend/src/test/admin-access-model.test.tsx`, если оно проверяет состав меню строки поставщика; проверить, что `npx vitest run src/test/suppliers-list-page.test.tsx src/test/admin-access-model.test.tsx src/test/suppliers-management.test.tsx` проходит
- [x] 4.3 Добавить ключ локализации пункта меню `suppliers.actions.details` в `frontend/src/shared/i18n/locales/en/common.json` и `frontend/src/shared/i18n/locales/ru/common.json`; проверить, что наборы ключей английской и русской локалей совпадают, а `npx vitest run src/test/i18n-feedback.test.tsx` проходит

## 5. Браузерный сценарий карточки

- [x] 5.1 Дополнить `frontend/e2e/helpers.ts` моком `GET /api/v1/suppliers/{id}`: расширить существующий обработчик маршрута `/\/api\/v1\/suppliers\/[^/]+$/` (где обрабатывается DELETE) веткой GET по шаблону мока `GET /api/v1/products/{id}` — 200 с телом `internal_supplier.Response` для существующего поставщика, 404 для не существующего id; обработка DELETE и `route.fallback()` для прочих методов не меняются (как в существующих моках изменения адреса); существующие моки списков, адресов и фотографий не меняются; проверить, что существующие e2e-файлы не получают регрессию
- [x] 5.2 Создать `frontend/e2e/suppliers-details.spec.ts`: открыть `/suppliers`, из меню строки открыть карточку и убедиться, что отображаются поля карточки и блок адреса; вернуться к списку действием карточки; открыть карточку не существующего поставщика по прямой ссылке и убедиться в состоянии отсутствия; проверить, что `npx playwright test e2e/` проходит целиком

## 6. Итоговая проверка

- [x] 6.1 Выполнить `npm run check` в `frontend/` и убедиться, что typecheck, lint, юнит-тесты и production-сборка проходят без ошибок
- [x] 6.2 Выполнить `npm run test:e2e` в `frontend/` и убедиться, что все браузерные сценарии проходят, включая новый сценарий карточки
- [x] 6.3 Проверить `git status --short` и `git diff`: изменены только `frontend/src/app/router.tsx`, каталог `frontend/src/pages/suppliers/`, ключи локализации, тесты и артефакты этого изменения; изменений в `api/`, `service_auth/`, `frontend/e2e-live/` и несвязанных файлах нет; закоммиченных изменений нет
- [x] 6.4 Выполнить `openspec validate add-supplier-details-page --strict` и `openspec validate --specs --strict` и убедиться, что валидация проходит без ошибок
- [x] 6.5 Проверить вручную в браузере на живом стенде (стек поднят): перейти из списка в карточку реального поставщика, убедиться, что телефон и адрес соответствуют ответу `GET /api/v1/suppliers/{id}`, проверить интерфейс на английском и русском языках, а карточку несуществующего uuid — в состоянии отсутствия поставщика

## Workflow follow-up

- Не архивировать изменение, пока не пройдены `npm run check`, `npm run test:e2e` и задачи группы 6.
- После успешной проверки заархивировать изменение (`openspec archive`), убедившись, что все задачи отмечены выполненными.
- После архивации проверить, что в `openspec/specs/` появилась capability `frontend/supplier-details`, а в `frontend/suppliers-management` добавлено требование о переходе к карточке из строки списка, и что новая capability не создана ни в каком другом месте.
