package image

import (
	"be2/internal/product"
	"errors"
	"log"
	"net/http"
)

var (
	ErrNotFound = errors.New("image not found")
)

func MapErrToHTTP(err error) (int, string) {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, product.ErrNotFound):
		return http.StatusNotFound, product.ErrNotFound.Error()

	default:
		log.Println(err)
		return http.StatusInternalServerError, "internal server error"
	}
}
