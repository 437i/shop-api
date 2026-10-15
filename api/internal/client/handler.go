package client

import (
	"be2/internal/address"
	"be2/internal/response"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service interface {
	Create(ctx context.Context, client Client, addr address.Address) (Client, address.Address, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetList(ctx context.Context, params ListFilter) ([]ClientWithAddress, error)
	UpdateAddress(ctx context.Context, id uuid.UUID, addr address.Address) error
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service}
}

// Create 	 создает нового клиента
// @Summary  Create new client
// @Tags 	 clients
// @Accept 	 json
// @Produce  json
// @Security BearerAuth
// @Param 	 request body CreateRequest true "Client data"
// @Success  201 {object} Response
// @Failure  400 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /clients [post]
func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Normalize()

	if err := req.Validate(); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	client, err := DTOToModel(req)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	addr := address.DTOToModel(req.Address)

	created, addr, err := h.service.Create(c.Request.Context(), client, addr)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusCreated, ToResponse(created, addr))
}

// Delete 	 удаляет клиента
// @Summary  Delete client by ID
// @Tags 	 clients
// @Security BearerAuth
// @Param 	 id path string true "Client ID" format(uuid)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /clients/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid client id")
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetList 		получает список клиентов
// @Summary 	Get a list of clients
// @Description Returns all clients or filters them by name and/or surname. Supports limit and offset.
// @Tags 		clients
// @Produce 	json
// @Security 	BearerAuth
// @Param 		name 	query string false "Client name"
// @Param 		surname query string false "Client surname"
// @Param 		limit 	query int 	 false "Maximum items per response" minimum(1)
// @Param 		offset 	query int 	 false "Number of items to skip" minimum(0)
// @Success 	200 {array}  Response
// @Failure 	400 {object} response.ErrorResponse
// @Failure 	500 {object} response.ErrorResponse
// @Router 		/clients [get]
func (h *Handler) GetList(c *gin.Context) {
	var q ListQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid query params")
		return
	}

	q.Normalize()

	clients, err := h.service.GetList(c.Request.Context(), ToFilter(q))
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}
	c.JSON(http.StatusOK, ToListResponse(clients))
}

// UpdateAddress обновляет адрес клиента
// @Summary 	 Update client address
// @Tags 		 clients
// @Accept 		 json
// @Security 	 BearerAuth
// @Param 		 request body UpdateAddressRequest true "New address"
// @Param 		 id 	 path string 			   true "Client ID" format(uuid)
// @Success 	 204
// @Failure 	 400 {object} response.ErrorResponse
// @Failure 	 404 {object} response.ErrorResponse
// @Failure 	 500 {object} response.ErrorResponse
// @Router 		 /clients/{id}/address [patch]
func (h *Handler) UpdateAddress(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid client id")
		return
	}

	var req UpdateAddressRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Address.Normalize()

	if err := req.Address.Validate(); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	if err := h.service.UpdateAddress(c.Request.Context(), id, address.DTOToModel(req.Address)); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}
