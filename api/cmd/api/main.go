package main

import (
	_ "be2/docs"
	"be2/internal/app"

	"github.com/joho/godotenv"
	"go.uber.org/fx"
)

// @title BE3 Shop API
// @version 1.0
// @description REST API магазина бытовой техники
// @host local.be3.test
// @BasePath /api/v1
// @schemes https
func main() {
	_ = godotenv.Load()

	fx.New(app.Module).Run()
}
