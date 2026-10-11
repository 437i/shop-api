package supplier

import (
	"be2/internal/address"
	"be2/internal/database"
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

func (r *repository) Create(ctx context.Context, supplier Supplier) (Supplier, error) {
	supplierDAO := ToDAO(supplier)

	sql, args, err := r.queryBuilder.
		Insert(Table).
		Columns(
			NameCol,
			AddressIDCol,
			PhoneCol,
		).
		Values(
			supplierDAO.Name,
			supplierDAO.AddressID,
			supplierDAO.Phone,
		).
		Suffix(
			"RETURNING " +
				IDCol + ", " +
				NameCol + ", " +
				AddressIDCol + ", " +
				PhoneCol,
		).
		ToSql()
	if err != nil {
		return Supplier{}, fmt.Errorf("build create query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return Supplier{}, fmt.Errorf("execute create query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[SupplierDAO])
	if err != nil {
		return Supplier{}, fmt.Errorf("collect created supplier: %w", err)
	}

	return DAOToModel(dao), nil
}

func (r *repository) UpdateAddress(ctx context.Context, id uuid.UUID, addressID uuid.UUID) error {
	sql, args, err := r.queryBuilder.
		Update(Table).
		Set(AddressIDCol, addressID).
		Where(sq.Eq{IDCol: id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("build update supplier address query: %w", err)
	}

	res, err := r.db(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("execute update supplier address query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return ErrSupplierInUse
		}
		return fmt.Errorf("execute delete query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *repository) GetAll(ctx context.Context) ([]SupplierWithAddress, error) {
	sql, args, err := r.queryBuilder.
		Select(
			"s."+IDCol+" AS id",
			"s."+NameCol,
			"a."+address.IDCol+" AS address_id",
			"a."+address.CountryCol,
			"a."+address.CityCol,
			"a."+address.StreetCol,
			"s."+PhoneCol,
		).
		From(Table + " s").
		Join(fmt.Sprintf(
			"%s a ON s.%s = a.%s",
			address.Table, AddressIDCol, address.IDCol,
		)).
		OrderBy(
			"s." + IDCol,
		).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("build get suppliers query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("execute get suppliers query: %w", err)
	}

	suppliers, err := pgx.CollectRows(rows, pgx.RowToStructByName[SupplierFullDAO])
	if err != nil {
		return nil, fmt.Errorf("collect suppliers: %w", err)
	}

	return ToListModels(suppliers), nil
}

func (r *repository) GetByID(ctx context.Context, id uuid.UUID) (SupplierWithAddress, error) {
	sql, args, err := r.queryBuilder.
		Select(
			"s."+IDCol+" AS id",
			"s."+NameCol,
			"a."+address.IDCol+" AS address_id",
			"a."+address.CountryCol,
			"a."+address.CityCol,
			"a."+address.StreetCol,
			"s."+PhoneCol,
		).
		From(Table + " s").
		Join(fmt.Sprintf(
			"%s a ON s.%s = a.%s",
			address.Table, AddressIDCol, address.IDCol,
		)).
		Where(sq.Eq{"s." + IDCol: id}).
		ToSql()
	if err != nil {
		return SupplierWithAddress{}, fmt.Errorf("build get supplier query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return SupplierWithAddress{}, fmt.Errorf("execute get supplier query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[SupplierFullDAO])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return SupplierWithAddress{}, ErrNotFound
		}
		return SupplierWithAddress{}, fmt.Errorf("collect supplier: %w", err)
	}

	return FullDAOToModel(dao), nil
}
