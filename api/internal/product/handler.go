package product

import (
	"be2/internal/category"
	"be2/internal/response"
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service interface {
	Create(ctx context.Context, product Product, category category.Category) (Product, error)
	DecreaseStock(ctx context.Context, id uuid.UUID, amount int) error
	GetByID(ctx context.Context, id uuid.UUID) (ProductFull, error)
	GetAll(ctx context.Context) ([]ProductWithCategory, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service}
}

// Create 	 создает новый товар
// @Summary  Create new product
// @Tags 	 products
// @Accept 	 json
// @Produce  json
// @Security BearerAuth
// @Param 	 request body CreateRequest true "Product data"
// @Success  201 {object} CreateResponse
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products [post]
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

	product, err := DTOToModel(req)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	cat := category.DTOToModel(req.Category)

	created, err := h.service.Create(c.Request.Context(), product, cat)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusCreated, ToCreateResponse(created))
}

// DecreaseStock уменьшает количество товара
// @Summary  Decrease product quantity in stock
// @Tags 	 products
// @Accept 	 json
// @Produce  json
// @Security BearerAuth
// @Param 	 id 	 path string 			   true "Product ID" format(uuid)
// @Param 	 request body DecreaseStockRequest true "Amount to decrease by"
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  409 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products/{id}/stock [patch]
func (h *Handler) DecreaseStock(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	var req DecreaseStockRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.DecreaseStock(c.Request.Context(), id, req.Amount); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetByID 	 получить товар
// @Summary  Get product
// @Tags 	 products
// @Produce  json
// @Security BearerAuth
// @Param 	 id path string true "Product ID" format(uuid)
// @Success  200 {object} FullResponse
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products/{id} [get]
func (h *Handler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	product, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusOK, ToFullResponse(product))
}

// GetAll 	 получить все доступные товары
// @Summary  Get all products in stock
// @Tags 	 products
// @Produce  json
// @Security BearerAuth
// @Success  200 {array} ListResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products [get]
func (h *Handler) GetAll(c *gin.Context) {
	products, err := h.service.GetAll(c.Request.Context())
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusOK, ToListResponse(products))
}

// Delete 	 удалить товар
// @Summary  Delete product
// @Tags 	 products
// @Security BearerAuth
// @Param 	 id path string true "Product ID" format(uuid)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}
