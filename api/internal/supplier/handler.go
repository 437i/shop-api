package supplier

import (
	"be2/internal/address"
	"be2/internal/response"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service interface {
	Create(ctx context.Context, supplier Supplier, addr address.Address) (Supplier, address.Address, error)
	UpdateAddress(ctx context.Context, id uuid.UUID, addr address.Address) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetAll(ctx context.Context) ([]SupplierWithAddress, error)
	GetByID(ctx context.Context, id uuid.UUID) (SupplierWithAddress, error)
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service}
}

// Create 	 создать поставщика
// @Summary  Create new supplier
// @Tags 	 suppliers
// @Accept 	 json
// @Produce  json
// @Security BearerAuth
// @Param 	 request body CreateRequest true "Supplier data"
// @Success  201 {object} Response
// @Failure  400 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /suppliers [post]
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

	supplier := DTOToModel(req)
	addr := address.DTOToModel(req.Address)

	created, addr, err := h.service.Create(c.Request.Context(), supplier, addr)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusCreated, ToResponse(created, addr))
}

// UpdateAddress обновляет адрес поставщика
// @Summary  Update supplier address
// @Tags 	 suppliers
// @Accept 	 json
// @Security BearerAuth
// @Param 	 request body UpdateAddressRequest true "New address"
// @Param 	 id 	 path string 			   true "Supplier ID" format(uuid)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /suppliers/{id}/address [patch]
func (h *Handler) UpdateAddress(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid supplier id")
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

// Delete 	 удаляет поставщика
// @Summary  Delete supplier by ID
// @Tags 	 suppliers
// @Security BearerAuth
// @Param 	 id path string true "Supplier ID" format(uuid)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /suppliers/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid supplier id")
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetAll 	 получить всех поставщиков
// @Summary  Get a list of all suppliers
// @Tags 	 suppliers
// @Produce  json
// @Security BearerAuth
// @Success  200 {array}  Response
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /suppliers [get]
func (h *Handler) GetAll(c *gin.Context) {
	suppliers, err := h.service.GetAll(c.Request.Context())
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusOK, ToListResponse(suppliers))
}

// GetByID 	 получить поставщика
// @Summary  Get supplier
// @Tags 	 suppliers
// @Produce  json
// @Security BearerAuth
// @Param 	 id path string true "Supplier ID" format(uuid)
// @Success  200 {object} Response
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /suppliers/{id} [get]
func (h *Handler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid supplier id")
		return
	}

	supplier, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusOK, ToResponse(supplier.Supplier, supplier.Address))
}
