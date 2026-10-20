package auth

import "errors"

var (
	ErrTokenNotFoundInCtx = errors.New("token not found in context")
	ErrInvalidToken       = errors.New("invalid token")
)
