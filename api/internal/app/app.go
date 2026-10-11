package app

import (
	"be2/internal/address"
	"be2/internal/category"
	"be2/internal/client"
	"be2/internal/config"
	"be2/internal/database"
	"be2/internal/image"
	"be2/internal/product"
	"be2/internal/server"
	"be2/internal/supplier"

	"go.uber.org/fx"
)

var repoModule = fx.Options(
	fx.Provide(
		fx.Annotate(address.NewRepository,
			fx.As(new(address.Repository)),
		),
		fx.Annotate(category.NewRepository,
			fx.As(new(category.Repository)),
		),
		fx.Annotate(client.NewRepository,
			fx.As(new(client.Repository)),
		),
		fx.Annotate(product.NewRepository,
			fx.As(new(product.Repository)),
			fx.As(new(image.ProductImageSetter)),
		),
		fx.Annotate(supplier.NewRepository,
			fx.As(new(supplier.Repository)),
		),
		fx.Annotate(image.NewRepository,
			fx.As(new(image.Repository)),
		),
	),
)

var serviceModule = fx.Options(
	fx.Provide(
		fx.Annotate(
			client.NewService,
			fx.As(new(client.Service)),
		),
		fx.Annotate(
			product.NewService,
			fx.As(new(product.Service)),
		),
		fx.Annotate(
			supplier.NewService,
			fx.As(new(supplier.Service)),
		),
		fx.Annotate(
			image.NewService,
			fx.As(new(image.Service)),
		),
	),
)

var handlerModule = fx.Options(
	fx.Provide(
		client.NewHandler,
		product.NewHandler,
		supplier.NewHandler,
		image.NewHandler,
	),
)

var infraModule = fx.Options(
	fx.Provide(
		fx.Annotate(
			database.NewManager,
			fx.As(new(database.Transactor)),
		),
		database.DBInit,
		server.NewRouter,
		server.NewServer,
	),
	fx.Invoke(
		server.StartServer,
	),
)

var configModule = fx.Options(
	fx.Provide(
		config.Load,
		config.DB,
		config.Server,
	),
)

var Module = fx.Options(
	repoModule,
	serviceModule,
	handlerModule,
	infraModule,
	configModule,
)
