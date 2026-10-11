package client

import (
	"be2/internal/address"
	"errors"
	"log"
	"net/http"
)

var (
	ErrNotFound        = errors.New("client not found")
	ErrInvalidBirthday = errors.New("invalid birthday")
	ErrTimeTravel      = errors.New("time travellers not welcome")
	ErrTooOld          = errors.New("client can't be older than 100 years")
	ErrTooYoung        = errors.New("client can't be younger than 16 years")
	ErrNameEmpty       = errors.New("empty name")
	ErrSurnameEmpty    = errors.New("empty surname")
)

func MapErrToHTTP(err error) (int, string) {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, err.Error()
	case errors.Is(err, ErrInvalidBirthday):
		return http.StatusBadRequest, ErrInvalidBirthday.Error()
	case errors.Is(err, ErrTimeTravel):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrTooOld):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrTooYoung):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrNameEmpty):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrSurnameEmpty):
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
