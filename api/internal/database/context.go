package database

import "context"

type txKey struct{}

func withTx(ctx context.Context, tx DBTX) context.Context {
	return context.WithValue(ctx, txKey{}, tx)
}

func TxFromCtx(ctx context.Context) (DBTX, bool) {
	tx, ok := ctx.Value(txKey{}).(DBTX)
	return tx, ok
}
