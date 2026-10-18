# Spec Delta

## MODIFIED Requirements

### Requirement: Успешный ответ с данными отображает таблицу

Система MUST отображать таблицу товаров при успешном ответе 200 с непустым массивом, используя только поля `internal_product.ListResponse`.

#### Scenario: Успешный ответ с товарами
- **WHEN** GET-запрос на `/api/v1/products` возвращает 200 с массивом товаров
- **THEN** система отображает таблицу с колонками: Name, Category, Price, Available Stock
- **THEN** каждая строка таблицы соответствует одному элементу массива `internal_product.ListResponse[]`
- **THEN** колонка "Name" содержит значение поля `name`
- **THEN** колонка "Category" содержит значение поля `category.name`
- **THEN** колонка "Price" содержит значение поля `price` без изменений
- **THEN** колонка "Available Stock" содержит значение поля `available_stock`
- **THEN** каждая строка содержит меню действий с пунктами уменьшения остатка и удаления
