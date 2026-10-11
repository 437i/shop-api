package image

import (
	"be2/internal/database"
	"be2/internal/product"
	"context"
	"errors"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

func (r *repository) Insert(ctx context.Context, data []byte) (Image, error) {
	sql, args, err := r.queryBuilder.
		Insert(table).
		Columns(imageCol).
		Values(data).
		Suffix(
			"RETURNING " +
				idCol + ", " +
				imageCol,
		).
		ToSql()
	if err != nil {
		return Image{}, fmt.Errorf("build insert query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return Image{}, fmt.Errorf("execute insert query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ImageDAO])
	if err != nil {
		return Image{}, fmt.Errorf("collect inserted image: %w", err)
	}

	return DAOToModel(dao), nil
}

func (r *repository) Change(ctx context.Context, id uuid.UUID, data []byte) error {
	sql, args, err := r.queryBuilder.
		Update(table).
		Set(imageCol, data).
		Where(sq.Eq{idCol: id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("build change query: %w", err)
	}

	res, err := r.db(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("execute change query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
	sql, args, err := r.queryBuilder.
		Delete(table).
		Where(sq.Eq{idCol: id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("build delete query: %w", err)
	}

	res, err := r.db(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("execute delete query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *repository) GetByID(ctx context.Context, id uuid.UUID) (Image, error) {
	sql, args, err := r.queryBuilder.
		Select(
			idCol,
			imageCol,
		).
		From(table).
		Where(sq.Eq{idCol: id}).
		ToSql()
	if err != nil {
		return Image{}, fmt.Errorf("build get by id query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return Image{}, fmt.Errorf("execute get by id query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ImageDAO])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Image{}, ErrNotFound
		}
		return Image{}, fmt.Errorf("collect selected image: %w", err)
	}

	return DAOToModel(dao), nil
}

func (r *repository) GetByProductID(ctx context.Context, productID uuid.UUID) (Image, error) {
	sql, args, err := r.queryBuilder.
		Select(
			"i."+idCol,
			"i."+imageCol,
		).
		From(table + " i").
		Join(fmt.Sprintf(
			"%s p ON p.%s = i.%s",
			product.Table, product.ImageIDCol, idCol,
		)).
		Where(sq.Eq{"p." + product.IDCol: productID}).
		ToSql()
	if err != nil {
		return Image{}, fmt.Errorf("build get by product id query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return Image{}, fmt.Errorf("execute get by product id query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ImageDAO])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Image{}, ErrNotFound
		}
		return Image{}, fmt.Errorf("collect selected image: %w", err)
	}

	return DAOToModel(dao), nil
}
