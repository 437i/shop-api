package supplier

import (
	"be2/internal/address"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

type CreateRequest struct {
	Name        string                `json:"name"         binding:"required,max=255" example:"ООО Моя Оборона"`
	Address     address.CreateRequest `json:"address"      binding:"required"`
	PhoneNumber string                `json:"phone_number" binding:"required"         example:"+79991234567"`
}

func (r *CreateRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Address.Normalize()
	r.PhoneNumber = normalizePhone(r.PhoneNumber)
}

func normalizePhone(s string) string {
	var b strings.Builder
	for i, c := range s {
		if c == '+' && i == 0 {
			b.WriteRune(c)
			continue
		}
		if c >= '0' && c <= '9' {
			b.WriteRune(c)
		}
	}
	return b.String()
}

var phoneRegexp = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

func (r CreateRequest) Validate() error {
	if r.Name == "" {
		return ErrNameEmpty
	}
	if r.PhoneNumber == "" {
		return ErrPhoneEmpty
	}
	if !phoneRegexp.MatchString(r.PhoneNumber) {
		return ErrPhoneInvalid
	}
	return r.Address.Validate()
}

type UpdateAddressRequest struct {
	Address address.CreateRequest `json:"address"`
}

type Response struct {
	ID          uuid.UUID        `json:"id"`
	Name        string           `json:"name"         example:"ООО Моя Оборона"`
	Address     address.Response `json:"address"`
	PhoneNumber string           `json:"phone_number" example:"+79991234567"`
}
