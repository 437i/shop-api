package auth

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

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
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	valid, err := m.validator.ValidateToken(ctx, token)
	if err != nil {
		log.Printf("validate grpc error: %v", err)
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
			"error": "auth service unavailable",
		})
		return
	}

	if !valid {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "invalid or expired token",
		})
		return
	}

	c.Next()
}

func extractToken(c *gin.Context) (string, error) {
	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", errors.New("missing or invalid authorization header")
	}

	return parts[1], nil
}
