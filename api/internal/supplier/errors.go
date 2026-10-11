package supplier

import (
	"be2/internal/address"
	"errors"
	"log"
	"net/http"
)

var (
	ErrNameEmpty     = errors.New("empty name")
	ErrPhoneEmpty    = errors.New("empty phone number")
	ErrPhoneInvalid  = errors.New("invalid phone number")
	ErrNotFound      = errors.New("supplier not found")
	ErrSupplierInUse = errors.New("supplier is used by products")
)

func MapErrToHTTP(err error) (int, string) {
	switch {
	case errors.Is(err, ErrNameEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrPhoneEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrPhoneInvalid):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, ErrSupplierInUse):
		return http.StatusBadRequest, err.Error()

	case errors.Is(err, address.ErrCountryEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, address.ErrCityEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, address.ErrStreetEmpty):
		return http.StatusBadRequest, err.Error()

	default:
		log.Println(err)
		return http.StatusInternalServerError, "internal server error"
	}
}
