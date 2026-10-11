-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION delete_orphan_image()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM products WHERE image_id = OLD.image_id
    )
    THEN
        DELETE FROM images WHERE id = OLD.image_id;
    END IF;

    RETURN OLD;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER trg_products_delete_orphan_image
AFTER DELETE ON products
FOR EACH ROW
WHEN (OLD.image_id IS NOT NULL)
EXECUTE FUNCTION delete_orphan_image();

CREATE TRIGGER trg_products_update_orphan_image
AFTER UPDATE OF image_id ON products
FOR EACH ROW
WHEN (OLD.image_id IS NOT NULL AND OLD.image_id IS DISTINCT FROM NEW.image_id)
EXECUTE FUNCTION delete_orphan_image();

-- +goose Down
DROP TRIGGER IF EXISTS trg_products_delete_orphan_image ON products;
DROP TRIGGER IF EXISTS trg_products_update_orphan_image ON products;

DROP FUNCTION IF EXISTS delete_orphan_image();