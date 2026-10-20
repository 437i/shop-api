package auth

import (
	"be2/internal/response"
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type ctxTokenKey struct{}

type Validator interface {
	ValidateToken(ctx context.Context, token string) (bool, error)
}

type Middleware struct {
	validator Validator
}

func NewMiddleware(validator Validator) *Middleware {
	return &Middleware{validator: validator}
}

func (m *Middleware) Auth(c *gin.Context) {
	token, err := extractToken(c)
	if err != nil {
		response.Abort(c, http.StatusUnauthorized, err.Error())
		return
	}

	valid, err := m.validator.ValidateToken(c.Request.Context(), token)
	if err != nil {
		log.Printf("validate grpc error: %v", err)
		code, msg := MapErrToHTTP(err)
		response.Abort(c, code, msg)
		return
	}

	if !valid {
		response.Abort(c, http.StatusUnauthorized, "invalid or expired token")
		return
	}

	c.Request = c.Request.WithContext(tokenToCtx(c.Request.Context(), token))

	c.Next()
}

func extractToken(c *gin.Context) (string, error) {
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("missing or invalid authorization header")
	}

	return parts[1], nil
}

func tokenToCtx(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, ctxTokenKey{}, token)
}

func tokenFromCtx(ctx context.Context) (string, error) {
	tokenVal := ctx.Value(ctxTokenKey{})
	if tokenVal == nil {
		return "", ErrTokenNotFoundInCtx
	}

	token, ok := tokenVal.(string)
	if !ok {
		return "", ErrInvalidToken
	}

	return token, nil
}
