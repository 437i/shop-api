package auth

import (
	"context"
	"fmt"
	"log"
	"net"

	"be2/internal/config"

	"go.uber.org/fx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func NewGRPCConn(lc fx.Lifecycle, cfg config.AuthConfig) (*grpc.ClientConn, error) {
	target := net.JoinHostPort(cfg.Host, cfg.Port)

	conn, err := grpc.NewClient(
		target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("create auth gRPC connection: %w", err)
	}

	lc.Append(fx.Hook{
		OnStop: func(context.Context) error {
			log.Println("grpc connection closing")
			return conn.Close()
		},
	})

	return conn, nil
}
