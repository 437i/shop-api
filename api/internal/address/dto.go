package address

import (
	"strings"

	"github.com/google/uuid"
)

type CreateRequest struct {
	Country string `json:"country" binding:"required,max=255" example:"Россия"`
	City    string `json:"city"    binding:"required,max=255" example:"Москва"`
	Street  string `json:"street"  binding:"required,max=255" example:"Ленина, 10"`
}

func (r *CreateRequest) Normalize() {
	r.Country = strings.TrimSpace(r.Country)
	r.City = strings.TrimSpace(r.City)
	r.Street = strings.TrimSpace(r.Street)
}

func (r CreateRequest) Validate() error {
	if r.Country == "" {
		return ErrCountryEmpty
	}
	if r.City == "" {
		return ErrCityEmpty
	}
	if r.Street == "" {
		return ErrStreetEmpty
	}
	return nil
}

type Response struct {
	ID      uuid.UUID `json:"id"`
	Country string    `json:"country" example:"Россия"`
	City    string    `json:"city"    example:"Москва"`
	Street  string    `json:"street"  example:"Ленина, 10"`
}
