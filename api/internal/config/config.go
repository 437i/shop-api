package config

import (
	"errors"
	"log"
	"os"
)

type Config struct {
	DB     DBConfig
	Server ServerConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type ServerConfig struct {
	Port string
}

func Load() (Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Println("PORT not set, using default 8080")
	}

	cfg := Config{
		DB: DBConfig{
			Host:     os.Getenv("DB_HOST"),
			Port:     os.Getenv("DB_PORT"),
			User:     os.Getenv("DB_USER"),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     os.Getenv("DB_NAME"),
		},
		Server: ServerConfig{
			Port: ":" + port,
		},
	}

	switch {
	case cfg.DB.Host == "":
		return Config{}, errors.New("DB_HOST is required")
	case cfg.DB.Port == "":
		return Config{}, errors.New("DB_PORT is required")
	case cfg.DB.User == "":
		return Config{}, errors.New("DB_USER is required")
	case cfg.DB.Password == "":
		return Config{}, errors.New("DB_PASSWORD is required")
	case cfg.DB.Name == "":
		return Config{}, errors.New("DB_NAME is required")
	}

	return cfg, nil
}

func DB(cfg Config) DBConfig         { return cfg.DB }
func Server(cfg Config) ServerConfig { return cfg.Server }
