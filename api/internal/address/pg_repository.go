package address

import (
	"be2/internal/database"
	"context"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	pool         *pgxpool.Pool
	queryBuilder sq.StatementBuilderType
}

func NewRepository(pool *pgxpool.Pool) *repository {
	return &repository{
		pool:         pool,
		queryBuilder: sq.StatementBuilder.PlaceholderFormat(sq.Dollar),
	}
}

func (r *repository) db(ctx context.Context) database.DBTX {
	if tx, ok := database.TxFromCtx(ctx); ok {
		return tx
	}
	return r.pool
}

func (r *repository) GetOrCreate(ctx context.Context, address Address) (uuid.UUID, error) {
	addressDAO := ModelToDAO(address)

	sql, args, err := r.queryBuilder.
		Insert(Table).
		Columns(CountryCol, CityCol, StreetCol).
		Values(
			addressDAO.Country,
			addressDAO.City,
			addressDAO.Street,
		).
		Suffix(
			"ON CONFLICT (" +
				CountryCol + ", " +
				CityCol + ", " +
				StreetCol +
				") DO UPDATE SET " +
				CountryCol + " = EXCLUDED." + CountryCol +
				" RETURNING " + IDCol,
		).
		ToSql()
	if err != nil {
		return uuid.Nil, fmt.Errorf("build GetOrCreate query: %w", err)
	}

	var id uuid.UUID

	err = r.db(ctx).QueryRow(ctx, sql, args...).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("execute GetOrCreate query: %w", err)
	}

	return id, nil
}
