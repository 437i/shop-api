-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION delete_orphan_address()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM clients WHERE address_id = OLD.address_id
    ) 
    AND NOT EXISTS (
        SELECT 1 FROM suppliers WHERE address_id = OLD.address_id
    )
    THEN 
        DELETE FROM addresses WHERE id = OLD.address_id;
    END IF;

    RETURN OLD;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER trg_clients_delete_orphan_address
AFTER DELETE ON clients
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_address();

CREATE TRIGGER trg_suppliers_delete_orphan_address
AFTER DELETE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION delete_orphan_address();

CREATE TRIGGER trg_clients_update_orphan_address
AFTER UPDATE OF address_id ON clients
FOR EACH ROW
WHEN (OLD.address_id IS DISTINCT FROM NEW.address_id)
EXECUTE FUNCTION delete_orphan_address();

CREATE TRIGGER trg_suppliers_update_orphan_address
AFTER UPDATE OF address_id ON suppliers
FOR EACH ROW
WHEN (OLD.address_id IS DISTINCT FROM NEW.address_id)
EXECUTE FUNCTION delete_orphan_address();

-- +goose Down
DROP TRIGGER IF EXISTS trg_clients_delete_orphan_address ON clients;
DROP TRIGGER IF EXISTS trg_suppliers_delete_orphan_address ON suppliers;
DROP TRIGGER IF EXISTS trg_clients_update_orphan_address ON clients;
DROP TRIGGER IF EXISTS trg_suppliers_update_orphan_address ON suppliers;

DROP FUNCTION IF EXISTS delete_orphan_address();
