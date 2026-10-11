package supplier

import (
	"github.com/google/uuid"
)

type SupplierDAO struct {
	ID        uuid.UUID `db:"id"`
	Name      string    `db:"name"`
	AddressID uuid.UUID `db:"address_id"`
	Phone     string    `db:"phone_number"`
}

type SupplierFullDAO struct {
	ID        uuid.UUID `db:"id"`
	Name      string    `db:"name"`
	AddressID uuid.UUID `db:"address_id"`
	Country   string    `db:"country"`
	City      string    `db:"city"`
	Street    string    `db:"street"`
	Phone     string    `db:"phone_number"`
}

const Table = "suppliers"

const (
	IDCol        = "id"
	NameCol      = "name"
	AddressIDCol = "address_id"
	PhoneCol     = "phone_number"
)
