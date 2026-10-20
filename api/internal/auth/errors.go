package auth

import (
	"errors"
	"net/http"
)

var (
	ErrServiceError       = errors.New("auth service error")
	ErrInvalidData        = errors.New("invalid data")
	ErrAlreadyExists      = errors.New("user already exists")
	ErrNotFound           = errors.New("user not found")
	ErrUnauthenticated    = errors.New("invalid email or password")
	ErrUnavailable        = errors.New("auth service unavailable")
	ErrTokenNotFoundInCtx = errors.New("token not found in context")
	ErrInvalidToken       = errors.New("invalid token")
	ErrWrongPassword      = errors.New("invalid current password")
)

func MapErrToHTTP(err error) (int, string) {
	switch {
	case errors.Is(err, ErrServiceError):
		return http.StatusBadGateway, ErrServiceError.Error()
	case errors.Is(err, ErrInvalidData):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, ErrAlreadyExists):
		return http.StatusConflict, ErrAlreadyExists.Error()
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound, ErrNotFound.Error()
	case errors.Is(err, ErrUnauthenticated):
		return http.StatusUnauthorized, ErrUnauthenticated.Error()
	case errors.Is(err, ErrUnavailable):
		return http.StatusServiceUnavailable, ErrUnavailable.Error()
	case errors.Is(err, ErrWrongPassword):
		return http.StatusBadRequest, ErrWrongPassword.Error()
	default:
		return http.StatusInternalServerError, "internal server error"
	}
}
