CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email VARCHAR(100) NOT NULL UNIQUE,
                       first_name VARCHAR(50) NOT NULL,
                       last_name VARCHAR(50) NOT NULL,
                       phone_number VARCHAR(20),
                       password VARCHAR(255) NOT NULL
);