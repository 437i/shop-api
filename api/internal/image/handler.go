package image

import (
	"be2/internal/response"
	"context"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const maxImageSize = 10 << 20 // 10 MiB

type Service interface {
	Create(ctx context.Context, productID uuid.UUID, data []byte) (Image, error)
	Change(ctx context.Context, id uuid.UUID, data []byte) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (Image, error)
	GetByProductID(ctx context.Context, productID uuid.UUID) (Image, error)
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service}
}

// Create 	 создает изображение для товара
// @Summary  Add product image
// @Tags 	 images
// @Accept 	 octet-stream
// @Produce  json
// @Security BearerAuth
// @Param 	 id	  path string true "Product ID"  format(uuid)
// @Param 	 file body string true "Image bytes" format(binary)
// @Success  201 {object} CreateResponse
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router   /products/{id}/image [post]
func (h *Handler) Create(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxImageSize)

	data, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "cannot read request body")
		return
	}

	if len(data) == 0 {
		response.Error(c, http.StatusBadRequest, "empty image")
		return
	}

	img, err := h.service.Create(c.Request.Context(), id, data)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.JSON(http.StatusCreated, ToCreateResponse(img))
}

// Change 	 заменяет изображение
// @Summary  Replace image
// @Tags 	 images
// @Accept 	 octet-stream
// @Security BearerAuth
// @Param 	 id   path string true "Image ID"    format(uuid)
// @Param 	 file body string true "Image bytes" format(binary)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /images/{id} [put]
func (h *Handler) Change(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid image id")
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxImageSize)

	data, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "cannot read request body")
		return
	}

	if len(data) == 0 {
		response.Error(c, http.StatusBadRequest, "empty image")
		return
	}

	if err := h.service.Change(c.Request.Context(), id, data); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}

// Delete 	 удаляет изображение
// @Summary  Delete image
// @Tags 	 images
// @Security BearerAuth
// @Param 	 id path string true "Image ID" format(uuid)
// @Success  204
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /images/{id} [delete]
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid image id")
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetByID 	 получить изображение по его uuid
// @Summary  Get image by id
// @Tags 	 images
// @Produce  octet-stream
// @Security BearerAuth
// @Param 	 id path string true "Image ID" format(uuid)
// @Success  200 {string} string "Image binary data"
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router   /images/{id} [get]
func (h *Handler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid image id")
		return
	}

	img, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Header("Content-Disposition", `attachment; filename="image"`)
	c.Data(http.StatusOK, "application/octet-stream", img.Data)
}

// GetByProductID получить изображение по uuid товара
// @Summary  Get image by product id
// @Tags 	 images
// @Produce  octet-stream
// @Security BearerAuth
// @Param 	 id path string true "Product ID" format(uuid)
// @Success  200 {string} string "Image binary data"
// @Failure  400 {object} response.ErrorResponse
// @Failure  404 {object} response.ErrorResponse
// @Failure  500 {object} response.ErrorResponse
// @Router 	 /products/{id}/image [get]
func (h *Handler) GetByProductID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		response.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	img, err := h.service.GetByProductID(c.Request.Context(), id)
	if err != nil {
		code, msg := MapErrToHTTP(err)
		response.Error(c, code, msg)
		return
	}

	c.Header("Content-Disposition", `attachment; filename="image"`)
	c.Data(http.StatusOK, "application/octet-stream", img.Data)
}
