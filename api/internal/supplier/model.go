package supplier

import (
	"be2/internal/address"

	"github.com/google/uuid"
)

type Supplier struct {
	ID        uuid.UUID
	Name      string
	AddressID uuid.UUID
	Phone     string
}

type SupplierWithAddress struct {
	Supplier Supplier
	Address  address.Address
}
