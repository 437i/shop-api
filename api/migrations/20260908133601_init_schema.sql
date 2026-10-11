-- +goose Up
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    street TEXT NOT NULL,

    CONSTRAINT uq_addresses_country_city_street
        UNIQUE (country, city, street)
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    client_surname TEXT NOT NULL,
    birthday DATE NOT NULL,
    gender VARCHAR(3) NOT NULL CHECK (gender IN ('m', 'f', 'n/a')),
    registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    address_id UUID NOT NULL,

    CONSTRAINT fk_clients_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address_id UUID NOT NULL,
    phone_number TEXT NOT NULL,

    CONSTRAINT fk_suppliers_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    available_stock INTEGER NOT NULL CHECK (available_stock >= 0),
    last_update_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    supplier_id UUID NOT NULL,
    image_id UUID,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_products_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_products_image
        FOREIGN KEY (image_id)
        REFERENCES images(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_address_id 
    ON clients (address_id);

CREATE INDEX IF NOT EXISTS idx_clients_name_surname
    ON clients (client_name, client_surname);

CREATE INDEX IF NOT EXISTS idx_clients_surname
    ON clients (client_surname);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id
    ON products (supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_category_id
    ON products (category_id);

-- +goose Down
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS addresses;