package main

import (
	_ "be2/docs"
	"be2/internal/app"

	"github.com/joho/godotenv"
	"go.uber.org/fx"
)

// @title 		BE3 Shop API
// @version 	1.0
// @description REST API магазина бытовой техники
// @BasePath 	/api/v1
// @securityDefinitions.apikey BearerAuth
// @in                         header
// @name                       Authorization
func main() {
	_ = godotenv.Load()

	fx.New(app.Module).Run()
}
