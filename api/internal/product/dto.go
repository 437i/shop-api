package product

import (
	"be2/internal/category"
	"be2/internal/supplier"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

type CreateRequest struct {
	Name           string                 `json:"name"            binding:"required,max=255" example:"Liebherr"`
	Category       category.CreateRequest `json:"category"        binding:"required"`
	Price          string                 `json:"price"           binding:"required"         example:"999.99"`
	AvailableStock int                    `json:"available_stock" binding:"required,gt=0"    example:"5"`
	SupplierID     uuid.UUID              `json:"supplier_id"     binding:"required"`
}

func (r *CreateRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Category.Normalize()
	r.Price = strings.TrimSpace(r.Price)
}

var priceRegexp = regexp.MustCompile(`^[1-9]\d{0,9}(\.\d{1,2})?$`)

func (r CreateRequest) Validate() error {
	if r.Name == "" {
		return ErrNameEmpty
	}
	if r.Price == "" {
		return ErrPriceEmpty
	}
	if !priceRegexp.MatchString(r.Price) {
		return ErrPriceInvalid
	}
	return r.Category.Validate()
}

type DecreaseStockRequest struct {
	Amount int `json:"amount" binding:"required,gt=0" example:"2"`
}

type CreateResponse struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name" example:"Liebherr"`
	CategoryID     uuid.UUID  `json:"category_id"`
	Price          string     `json:"price" example:"999.99"`
	AvailableStock int        `json:"available_stock" example:"5"`
	LastUpdateDate time.Time  `json:"last_update_date" format:"date-time" example:"2026-09-12T12:00:00Z"`
	SupplierID     uuid.UUID  `json:"supplier_id"`
	ImageID        *uuid.UUID `json:"image_id,omitempty"`
}

type FullResponse struct {
	ID             uuid.UUID         `json:"id"`
	Name           string            `json:"name" example:"Liebherr"`
	Category       category.Response `json:"category"`
	Price          string            `json:"price" example:"999.99"`
	AvailableStock int               `json:"available_stock" example:"5"`
	LastUpdateDate time.Time         `json:"last_update_date" format:"date-time" example:"2026-09-12T12:00:00Z"`
	Supplier       supplier.Response `json:"supplier"`
	ImageID        *uuid.UUID        `json:"image_id,omitempty"`
}

type ListResponse struct {
	ID             uuid.UUID         `json:"id"`
	Name           string            `json:"name" example:"Liebherr"`
	Category       category.Response `json:"category"`
	Price          string            `json:"price" example:"999.99"`
	AvailableStock int               `json:"available_stock" example:"5"`
	ImageID        *uuid.UUID        `json:"image_id,omitempty"`
}
