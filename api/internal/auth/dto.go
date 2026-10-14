package auth

import (
	"errors"
	"strings"
)

type RegisterRequest struct {
	Name     string `json:"name"     binding:"required,max=255" example:"Иван"`
	Surname  string `json:"surname"  binding:"required,max=255" example:"Иванов"`
	Email    string `json:"email"    binding:"required,email"   example:"email@example.com"`
	Phone    string `json:"phone"    binding:"required"         example:"+79991234567"`
	Password string `json:"password" binding:"required,min=8"   example:"$ExamplePass123!"`
}

func (r *RegisterRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Surname = strings.TrimSpace(r.Surname)
}

func (r RegisterRequest) Validate() error {
	if r.Name == "" {
		return errors.New("name empty")
	}
	if r.Surname == "" {
		return errors.New("surname empty")
	}
	return nil
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email" example:"email@example.com"`
	Password string `json:"password" binding:"required"       example:"$ExamplePass123!"`
}

type Response struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
}

type ResetRequest struct {
	Email string `json:"email" binding:"required,email" example:"email@example.com"`
}
