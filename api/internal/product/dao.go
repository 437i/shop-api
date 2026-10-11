package product

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type ProductDAO struct {
	ID             uuid.UUID       `db:"id"`
	Name           string          `db:"name"`
	CategoryID     uuid.UUID       `db:"category_id"`
	Price          decimal.Decimal `db:"price"`
	AvailableStock int             `db:"available_stock"`
	LastUpdateDate time.Time       `db:"last_update_date"`
	SupplierID     uuid.UUID       `db:"supplier_id"`
	ImageID        *uuid.UUID      `db:"image_id"`
}

type ProductFullDAO struct {
	ID             uuid.UUID       `db:"id"`
	Name           string          `db:"name"`
	CategoryID     uuid.UUID       `db:"category_id"`
	CategoryName   string          `db:"category_name"`
	Price          decimal.Decimal `db:"price"`
	AvailableStock int             `db:"available_stock"`
	LastUpdateDate time.Time       `db:"last_update_date"`
	SupplierID     uuid.UUID       `db:"supplier_id"`
	SupplierName   string          `db:"supplier_name"`
	AddressID      uuid.UUID       `db:"address_id"`
	Country        string          `db:"country"`
	City           string          `db:"city"`
	Street         string          `db:"street"`
	PhoneNumber    string          `db:"phone_number"`
	ImageID        *uuid.UUID      `db:"image_id"`
}

type ProductWithCategoryDAO struct {
	ID             uuid.UUID       `db:"id"`
	Name           string          `db:"name"`
	CategoryID     uuid.UUID       `db:"category_id"`
	CategoryName   string          `db:"category_name"`
	Price          decimal.Decimal `db:"price"`
	AvailableStock int             `db:"available_stock"`
	LastUpdateDate time.Time       `db:"last_update_date"`
	SupplierID     uuid.UUID       `db:"supplier_id"`
	ImageID        *uuid.UUID      `db:"image_id"`
}

const Table = "products"

const (
	IDCol             = "id"
	nameCol           = "name"
	categoryIDCol     = "category_id"
	priceCol          = "price"
	availableStockCol = "available_stock"
	lastUpdateDateCol = "last_update_date"
	supplierIDCol     = "supplier_id"
	ImageIDCol        = "image_id"
)
