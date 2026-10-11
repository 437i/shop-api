package client

import (
	"be2/internal/address"
	"be2/internal/database"
	"context"
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

func (r *repository) Create(ctx context.Context, client Client) (Client, error) {
	clientDAO := ToDAO(client)

	sql, args, err := r.queryBuilder.
		Insert(table).
		Columns(
			nameCol,
			surnameCol,
			birthdayCol,
			genderCol,
			addressIDCol,
		).
		Values(
			clientDAO.ClientName,
			clientDAO.ClientSurname,
			clientDAO.Birthday,
			clientDAO.Gender,
			clientDAO.AddressID,
		).
		Suffix(
			"RETURNING " +
				idCol + ", " +
				nameCol + ", " +
				surnameCol + ", " +
				birthdayCol + ", " +
				genderCol + ", " +
				registrationDateCol + ", " +
				addressIDCol,
		).
		ToSql()
	if err != nil {
		return Client{}, fmt.Errorf("build create query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return Client{}, fmt.Errorf("execute create query: %w", err)
	}

	dao, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ClientDAO])
	if err != nil {
		return Client{}, fmt.Errorf("collect created client: %w", err)
	}

	return DAOToModel(dao), nil
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

func (r *repository) GetList(ctx context.Context, filter ListFilter) ([]ClientWithAddress, error) {
	query := r.queryBuilder.
		Select(
			"c."+idCol+" AS id",
			"c."+nameCol,
			"c."+surnameCol,
			"c."+birthdayCol,
			"c."+genderCol,
			"c."+registrationDateCol,

			"a."+address.IDCol+" AS address_id",
			"a."+address.CountryCol,
			"a."+address.CityCol,
			"a."+address.StreetCol,
		).
		From(table+" c").
		Join(fmt.Sprintf(
			"%s a ON c.%s = a.%s",
			address.Table, addressIDCol, address.IDCol,
		)).
		OrderBy(
			"c."+registrationDateCol,
			"c."+idCol,
		)

	if filter.Name != "" {
		query = query.Where(
			sq.Eq{"c." + nameCol: filter.Name},
		)
	}
	if filter.Surname != "" {
		query = query.Where(
			sq.Eq{"c." + surnameCol: filter.Surname},
		)
	}
	if filter.Limit != nil {
		query = query.Limit(uint64(*filter.Limit))
	}
	if filter.Offset != nil {
		query = query.Offset(uint64(*filter.Offset))
	}

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, fmt.Errorf("build get clients query: %w", err)
	}

	rows, err := r.db(ctx).Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("execute get clients query: %w", err)
	}

	clients, err := pgx.CollectRows(rows, pgx.RowToStructByName[ClientFullDAO])
	if err != nil {
		return nil, fmt.Errorf("collect clients: %w", err)
	}

	return ToListModels(clients), nil
}

func (r *repository) UpdateAddress(ctx context.Context, id uuid.UUID, addressID uuid.UUID) error {
	sql, args, err := r.queryBuilder.
		Update(table).
		Set(addressIDCol, addressID).
		Where(sq.Eq{idCol: id}).
		ToSql()
	if err != nil {
		return fmt.Errorf("build update client address query: %w", err)
	}

	res, err := r.db(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("execute update client address query: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
