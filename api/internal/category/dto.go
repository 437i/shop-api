package category

import (
	"strings"

	"github.com/google/uuid"
)

type CreateRequest struct {
	Name string `json:"name" binding:"required,max=255" example:"Холодильники"`
}

func (r *CreateRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
}

func (r CreateRequest) Validate() error {
	if r.Name == "" {
		return ErrCategoryEmpty
	}
	return nil
}

type Response struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name" example:"Холодильники"`
}
