# Spec Delta

## Purpose

Серверная обработка удаления поставщика: нарушение ссылочного ограничения `products.supplier_id` при удалении классифицируется как HTTP 400 `supplier is used by products` независимо от кода SQLSTATE PostgreSQL (23001 или 23503), а остальной контракт удаления сохраняется.

## ADDED Requirements

### Requirement: Конфликт удаления используемого поставщика возвращает HTTP 400

Backend MUST отвечать на `DELETE /api/v1/suppliers/{id}` статусом HTTP 400 и сообщением `supplier is used by products`, если поставщик используется хотя бы одним товаром. Ответ MUST быть одинаковым как при SQLSTATE `23001` (`restrict_violation`, PostgreSQL 18 и новее), так и при SQLSTATE `23503` (`foreign_key_violation`, PostgreSQL 17 и раньше).

#### Scenario: PostgreSQL сообщает restrict_violation (23001)

- **WHEN** поставщик используется товаром и PostgreSQL возвращает SQLSTATE `23001` при удалении
- **THEN** ответ имеет статус HTTP 400 и тело `ErrorResponse` с сообщением `supplier is used by products`
- **THEN** поставщик и ссылающийся товар остаются без изменений

#### Scenario: PostgreSQL сообщает foreign_key_violation (23503)

- **WHEN** поставщик используется товаром и PostgreSQL возвращает SQLSTATE `23503` при удалении
- **THEN** ответ имеет статус HTTP 400 и тело `ErrorResponse` с сообщением `supplier is used by products`
- **THEN** поставщик и ссылающийся товар остаются без изменений

### Requirement: Прочие ошибки удаления обрабатываются как раньше

Backend MUST NOT классифицировать как нарушение ссылочного ограничения ошибки БД с иными SQLSTATE и ошибки, не являющиеся ошибками PostgreSQL; такие ошибки MUST по-прежнему обрабатываться как HTTP 500 с сообщением `internal server error`.

#### Scenario: Ошибка БД с другим SQLSTATE

- **WHEN** удаление завершается ошибкой PostgreSQL, не связанной с нарушением ссылочного ограничения (например, SQLSTATE `23505`)
- **THEN** ответ имеет статус HTTP 500 и сообщение `internal server error`
- **THEN** ответ не содержит сообщение `supplier is used by products`

#### Scenario: Ошибка выполнения запроса, не являющаяся ошибкой PostgreSQL

- **WHEN** удаление завершается ошибкой иного происхождения, не связанной с ограничениями PostgreSQL
- **THEN** ответ имеет статус HTTP 500 и сообщение `internal server error`

### Requirement: Контракт удаления поставщика сохраняется

Backend MUST сохранять существующий контракт `DELETE /api/v1/suppliers/{id}`: успешное удаление — HTTP 204 без тела, отсутствующий поставщик — HTTP 404 с сообщением `supplier not found`, недействительный id — HTTP 400, запрос без действительного Bearer-токена — HTTP 401 от middleware.

#### Scenario: Успешное удаление

- **WHEN** поставщик существует и не используется товарами
- **THEN** удаление выполняется, ответ имеет статус HTTP 204 без тела

#### Scenario: Поставщик не найден

- **WHEN** поставщик с указанным id отсутствует
- **THEN** ответ имеет статус HTTP 404 и сообщение `supplier not found`
- **THEN** данные не изменяются

#### Scenario: Недействительный id

- **WHEN** id в пути не является корректным UUID
- **THEN** ответ имеет статус HTTP 400 и сообщение `invalid supplier id`

#### Scenario: Запрос без действительного токена

- **WHEN** запрос выполняется без действительного Bearer-токена
- **THEN** запрос отклоняется middleware со статусом HTTP 401 до обработки удаления
