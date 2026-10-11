package client

import (
	"be2/internal/address"
	"strings"
	"time"

	"github.com/google/uuid"
)

type CreateRequest struct {
	Name     string                `json:"name"     binding:"required,max=255"             example:"Иван"`
	Surname  string                `json:"surname"  binding:"required,max=255"             example:"Иванов"`
	Birthday string                `json:"birthday" binding:"required,datetime=2006-01-02" example:"1986-09-12"`
	Gender   string                `json:"gender"   binding:"required,oneof=m f n/a"       example:"m"`
	Address  address.CreateRequest `json:"address"  binding:"required"`
}

func (r *CreateRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Surname = strings.TrimSpace(r.Surname)
	r.Address.Normalize()
}

func (r CreateRequest) Validate() error {
	if r.Name == "" {
		return ErrNameEmpty
	}
	if r.Surname == "" {
		return ErrSurnameEmpty
	}
	return r.Address.Validate()
}

type ListQuery struct {
	Name    string `form:"name"`
	Surname string `form:"surname"`
	Limit   *int   `form:"limit"  binding:"omitempty,min=1"`
	Offset  *int   `form:"offset" binding:"omitempty,min=0"`
}

func (q *ListQuery) Normalize() {
	q.Name = strings.TrimSpace(q.Name)
	q.Surname = strings.TrimSpace(q.Surname)
}

type UpdateAddressRequest struct {
	Address address.CreateRequest `json:"address"`
}

type Response struct {
	ID               uuid.UUID        `json:"id"`
	Name             string           `json:"name"     example:"Иван"`
	Surname          string           `json:"surname"  example:"Иванов"`
	Birthday         string           `json:"birthday" example:"1986-09-12"`
	Gender           string           `json:"gender"   example:"m"`
	RegistrationDate time.Time        `json:"registration_date" format:"date-time" example:"2026-09-12T12:00:00Z"`
	Address          address.Response `json:"address"`
}
