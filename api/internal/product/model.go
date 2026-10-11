package product

import (
	"be2/internal/category"
	"be2/internal/supplier"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type Product struct {
	ID             uuid.UUID
	Name           string
	CategoryID     uuid.UUID
	Price          decimal.Decimal
	AvailableStock int
	LastUpdateDate time.Time
	SupplierID     uuid.UUID
	ImageID        *uuid.UUID
}

type ProductWithCategory struct {
	Product  Product
	Category category.Category
}

type ProductFull struct {
	Product  Product
	Category category.Category
	Supplier supplier.SupplierWithAddress
}
