package auth

import (
	"strings"
)

type RegisterRequest struct {
	Name     string `json:"name"     binding:"required" example:"Иван"`
	Surname  string `json:"surname"  binding:"required" example:"Иванов"`
	Email    string `json:"email"    binding:"required" example:"email@example.com"`
	Phone    string `json:"phone"    binding:"required" example:"+79991234567"`
	Password string `json:"password" binding:"required" example:"$ExamplePass123!"`
}

func (r *RegisterRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Surname = strings.TrimSpace(r.Surname)
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required" example:"email@example.com"`
	Password string `json:"password" binding:"required" example:"$ExamplePass123!"`
}

type Response struct {
	Token string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
}

type ResetRequest struct {
	Email string `json:"email" binding:"required" example:"email@example.com"`
}
