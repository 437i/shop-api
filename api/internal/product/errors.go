package product

import (
	"be2/internal/category"
	"errors"
	"log"
	"net/http"
)

var (
	ErrNameEmpty         = errors.New("empty name")
	ErrPriceEmpty        = errors.New("empty price")
	ErrPriceInvalid      = errors.New("invalid price")
	ErrSupplierNotFound  = errors.New("supplier not found")
	ErrNotFound          = errors.New("product not found")
	ErrInsufficientStock = errors.New("insufficient stock")
)

func MapErrToHTTP(err error) (int, string) {
	switch {
	case errors.Is(err, ErrNameEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrPriceEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrPriceInvalid):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrSupplierNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, ErrInsufficientStock):
		return http.StatusConflict, err.Error()

	case errors.Is(err, category.ErrCategoryEmpty):
		return http.StatusBadRequest, err.Error()

	default:
		log.Println(err)
		return http.StatusInternalServerError, "internal server error"
	}
}
