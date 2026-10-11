-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION delete_orphan_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM products WHERE category_id = OLD.category_id
    )
    THEN
        DELETE FROM categories WHERE id = OLD.category_id;
    END IF;

    RETURN OLD;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER trg_products_delete_orphan_category
AFTER DELETE ON products
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_category();

CREATE TRIGGER trg_products_update_orphan_category
AFTER UPDATE OF category_id ON products
FOR EACH ROW
WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
EXECUTE FUNCTION delete_orphan_category();

-- +goose Down
DROP TRIGGER IF EXISTS trg_products_delete_orphan_category ON products;
DROP TRIGGER IF EXISTS trg_products_update_orphan_category ON products;

DROP FUNCTION IF EXISTS delete_orphan_category();