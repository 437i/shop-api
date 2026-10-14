package server

import (
	"be2/internal/auth"
	"be2/internal/client"
	"be2/internal/image"
	"be2/internal/product"
	"be2/internal/supplier"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func NewRouter(
	client *client.Handler,
	product *product.Handler,
	supplier *supplier.Handler,
	image *image.Handler,
	auth *auth.Handler,
	middleware *Middleware,
) *gin.Engine {
	engine := gin.Default()

	engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	v1 := engine.Group("/api/v1")
	{
		v1.POST("/register", auth.Register)
		v1.POST("/auth", auth.Auth)
		v1.POST("/reset", auth.Reset)
	}

	protected := engine.Group("/api/v1")
	protected.Use(middleware.auth)

	clients := protected.Group("/clients")
	{
		clients.POST("", client.Create)
		clients.GET("", client.GetList)
		clients.DELETE("/:id", client.Delete)
		clients.PATCH("/:id/address", client.UpdateAddress)
	}

	products := protected.Group("/products")
	{
		products.POST("", product.Create)
		products.GET("", product.GetAll)
		products.GET("/:id", product.GetByID)
		products.DELETE("/:id", product.Delete)
		products.POST("/:id/image", image.Create)
		products.GET("/:id/image", image.GetByProductID)
		products.PATCH("/:id/stock", product.DecreaseStock)
	}

	suppliers := protected.Group("/suppliers")
	{
		suppliers.POST("", supplier.Create)
		suppliers.GET("", supplier.GetAll)
		suppliers.GET("/:id", supplier.GetByID)
		suppliers.DELETE("/:id", supplier.Delete)
		suppliers.PATCH("/:id/address", supplier.UpdateAddress)
	}

	images := protected.Group("/images")
	{
		images.GET("/:id", image.GetByID)
		images.PUT("/:id", image.Change)
		images.DELETE("/:id", image.Delete)
	}

	return engine
}
