package product

import (
	"be2/internal/address"
	"be2/internal/category"
	"be2/internal/database"
	"be2/internal/supplier"
	"context"
	"errors"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

func (r *repository) Create(ctx context.Context, product Product) (Product, error) {
	productDAO := ToDAO(product)

	sql, args, err := r.queryBuilder.
		Insert(Table).
		Columns(
			nameCol,
			categoryIDCol,
			priceCol,
			availableStockCol,
			supplierIDCol,
		).
		Values(
			productDAO.Name,
			productDAO.CategoryID,
			productDAO.Price,
			productDAO.AvailableStock,
			productDAO.SupplierID,
		).
		Suffix(
			"RETURNING " +
				IDCol + ", " +
				nameCol + ", " +
				categoryIDCol + ", " +
				priceCol + ", " +
				availableStockCol + ", " +
				lastUpdateDateCol + ", " +
				supplierIDCol + ", " +
				ImageIDCol,
		).
		ToSql()
	if err != nil {
		return Product{}, fmt.Errorf("build create query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return Product{}, ErrSupplierNotFound
		}
		return Product{}, fmt.Errorf("execute create query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ProductDAO])
	if err != nil {
		return Product{}, fmt.Errorf("collect created product: %w", err)
	}

	return DAOToModel(dao), nil
}

func (r *repository) DecreaseStock(ctx context.Context, id uuid.UUID, amount int) error {
	const query = `
		WITH locked AS (
			SELECT id, available_stock
			FROM products
			WHERE id = $1
			FOR UPDATE
		),
		updated AS (
			UPDATE products p
			SET available_stock = p.available_stock - $2,
				last_update_date = NOW()
			FROM locked l
			WHERE p.id = l.id
			  AND l.available_stock >= $2
			RETURNING p.available_stock
		)
		SELECT
			(SELECT COUNT(*) FROM locked)   AS found,
			(SELECT COUNT(*) FROM updated)  AS updated
	`

	var found, updated int

	if err := r.db(ctx).QueryRow(ctx, query, id, amount).Scan(&found, &updated); err != nil {
		return fmt.Errorf("execute decrease stock query: %w", err)
	}

	switch {
	case found == 0:
		return ErrNotFound
	case updated == 0:
		return ErrInsufficientStock
	default:
		return nil
	}
}

func (r *repository) GetByID(ctx context.Context, id uuid.UUID) (ProductFull, error) {
	sql, args, err := r.queryBuilder.
		Select(
			"p."+IDCol+" AS id",
			"p."+nameCol+" AS name",
			"p."+categoryIDCol+" AS category_id",
			"c."+category.NameCol+" AS category_name",
			"p."+priceCol+" AS price",
			"p."+availableStockCol+" AS available_stock",
			"p."+lastUpdateDateCol+" AS last_update_date",
			"p."+supplierIDCol+" AS supplier_id",
			"s."+supplier.NameCol+" AS supplier_name",
			"s."+supplier.AddressIDCol+" AS address_id",
			"a."+address.CountryCol+" AS country",
			"a."+address.CityCol+" AS city",
			"a."+address.StreetCol+" AS street",
			"s."+supplier.PhoneCol+" AS phone_number",
			"p."+ImageIDCol+" AS image_id",
		).
		From(Table + " p").
		Join(fmt.Sprintf(
			"%s c ON p.%s = c.%s",
			category.Table, categoryIDCol, category.IDCol,
		)).
		Join(fmt.Sprintf(
			"%s s ON p.%s = s.%s",
			supplier.Table, supplierIDCol, supplier.IDCol,
		)).
		Join(fmt.Sprintf(
			"%s a ON s.%s = a.%s",
			address.Table, supplier.AddressIDCol, address.IDCol,
		)).
		Where(sq.Eq{"p." + IDCol: id}).
		ToSql()
	if err != nil {
		return ProductFull{}, fmt.Errorf("build get by id query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return ProductFull{}, fmt.Errorf("execute get by id query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ProductFullDAO])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ProductFull{}, ErrNotFound
		}
		return ProductFull{}, fmt.Errorf("collect selected product: %w", err)
	}

	return FullDAOToModel(dao), nil
}

func (r *repository) GetAll(ctx context.Context) ([]ProductWithCategory, error) {
	sql, args, err := r.queryBuilder.
		Select(
			"p."+IDCol+" AS id",
			"p."+nameCol+" AS name",
			"p."+categoryIDCol+" AS category_id",
			"c."+category.NameCol+" AS category_name",
			"p."+priceCol+" AS price",
			"p."+availableStockCol+" AS available_stock",
			"p."+lastUpdateDateCol+" AS last_update_date",
			"p."+supplierIDCol+" AS supplier_id",
			"p."+ImageIDCol+" AS image_id",
		).
		From(Table + " p").
		Join(fmt.Sprintf(
			"%s c ON p.%s = c.%s",
			category.Table, categoryIDCol, category.IDCol,
		)).
		Where(sq.Gt{availableStockCol: 0}).
		OrderBy("p." + IDCol).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("build get all query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("execute get all query: %w", err)
	}

	daos, err := pgx.CollectRows(rows, pgx.RowToStructByName[ProductWithCategoryDAO])
	if err != nil {
		return nil, fmt.Errorf("collect products: %w", err)
	}

	return WithCategoryListToModels(daos), nil
}

func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
	sql, args, err := r.queryBuilder.
		Delete(Table).
		Where(sq.Eq{IDCol: id}).
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

func (r *repository) SetImage(ctx context.Context, productID, imageID uuid.UUID) error {
	sql, args, err := r.queryBuilder.
		Update(Table).
		Set(ImageIDCol, imageID).
		Where(sq.Eq{IDCol: productID}).
		ToSql()
	if err != nil {
		return fmt.Errorf("build set image query: %w", err)
	}

	res, err := r.db(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("execute set image query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
