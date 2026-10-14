package auth

import (
	"be2/internal/response"
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Service interface {
	Register(ctx context.Context, req RegisterRequest) (Response, error)
	Login(ctx context.Context, req LoginRequest) (Response, error)
	ResetPassword(ctx context.Context, req ResetRequest) error
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// Register создать пользователя
// @Summary Register new user
// @Tags 	auth
// @Accept  json
// @Produce json
// @Param 	request body RegisterRequest true "User data"
// @Success 201 {object} Response
// @Failure 400 {object} response.ErrorResponse
// @Failure 502 {object} response.ErrorResponse
// @Router  /register [post]
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Normalize()

	resp, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		log.Printf("register grpc error: %v", err)
		response.Error(c, http.StatusBadGateway, "auth service error")
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// Auth авторизует пользователя
// @Summary Login user
// @Tags 	auth
// @Accept  json
// @Produce json
// @Param 	request body LoginRequest true "Credentials"
// @Success 200 {object} Response
// @Failure 400 {object} response.ErrorResponse
// @Failure 502 {object} response.ErrorResponse
// @Router  /auth [post]
func (h *Handler) Auth(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		log.Printf("login grpc error: %v", err)
		response.Error(c, http.StatusBadGateway, "auth service error")
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Reset инициирует восстановление пароля
// @Summary Reset user password
// @Tags 	auth
// @Accept  json
// @Param 	request body ResetRequest true "User email"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 502 {object} response.ErrorResponse
// @Router  /reset [post]
func (h *Handler) Reset(c *gin.Context) {
	var req ResetRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), req); err != nil {
		log.Printf("reset grpc error: %v", err)
		response.Error(c, http.StatusBadGateway, "auth service error")
		return
	}

	c.Status(http.StatusNoContent)
}
