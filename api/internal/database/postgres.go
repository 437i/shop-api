package database

import (
	"be2/internal/config"
	"context"
	"fmt"
	"log"
	"net"
	"net/url"
	"time"

	pgxdecimal "github.com/jackc/pgx-shopspring-decimal"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/fx"
)

func connString(cfg config.DBConfig) string {
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   net.JoinHostPort(cfg.Host, cfg.Port),
		Path:   "/" + cfg.Name,
	}
	return u.String()
}

func DBInit(lc fx.Lifecycle, cfg config.DBConfig) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(connString(cfg))
	if err != nil {
		return nil, fmt.Errorf("parse db connection string: %w", err)
	}

	poolConfig.MaxConns = 10
	poolConfig.MinConns = 2
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = time.Minute * 30
	poolConfig.HealthCheckPeriod = time.Minute

	poolConfig.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		pgxdecimal.Register(conn.TypeMap())
		return nil
	}

	ctxTimeout, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctxTimeout, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("create db pool: %w", err)
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := pingDB(ctx, pool); err != nil {
				return fmt.Errorf("db ping: %w", err)
			}
			log.Println("db connection pool established")
			return nil
		},
		OnStop: func(context.Context) error {
			log.Println("db connection pool closing")
			pool.Close()
			return nil
		},
	})

	return pool, nil
}

func pingDB(ctx context.Context, pool *pgxpool.Pool) error {
	const (
		attempts    = 3
		pingTimeout = 5 * time.Second
		retryDelay  = 500 * time.Millisecond
	)

	var pingErr error

	for i := 1; i <= attempts; i++ {
		ctxTimeout, cancel := context.WithTimeout(ctx, pingTimeout)

		pingErr = pool.Ping(ctxTimeout)
		cancel()

		if pingErr == nil {
			return nil
		}

		log.Printf("db ping attempt %d failed: %v", i, pingErr)

		if i < attempts {
			time.Sleep(retryDelay)
		}
	}

	return pingErr
}
