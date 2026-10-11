package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Transactor interface {
	Do(ctx context.Context, fn func(ctx context.Context) error) error
}

type TxManager struct {
	pool *pgxpool.Pool
}

func NewManager(pool *pgxpool.Pool) *TxManager {
	return &TxManager{pool}
}

func (m *TxManager) Do(ctx context.Context, fn func(ctx context.Context) error) error {
	if _, ok := TxFromCtx(ctx); ok {
		return fn(ctx)
	}
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(context.Background())
			panic(p)
		}
		_ = tx.Rollback(context.Background())
	}()
	ctxWithTx := withTx(ctx, tx)
	if err := fn(ctxWithTx); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
