package supplier

import (
	"be2/internal/address"
	"be2/internal/database"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, supplier Supplier) (Supplier, error)
	UpdateAddress(ctx context.Context, id uuid.UUID, addressID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetAll(ctx context.Context) ([]SupplierWithAddress, error)
	GetByID(ctx context.Context, id uuid.UUID) (SupplierWithAddress, error)
}

type service struct {
	repo        Repository
	addressRepo address.Repository
	txManager   database.Transactor
}

func NewService(repo Repository, addressRepo address.Repository, txManager database.Transactor) *service {
	return &service{
		repo:        repo,
		addressRepo: addressRepo,
		txManager:   txManager,
	}
}

func (s *service) Create(ctx context.Context, supplier Supplier, addr address.Address) (Supplier, address.Address, error) {
	err := s.txManager.Do(ctx, func(ctx context.Context) error {
		addressID, err := s.addressRepo.GetOrCreate(ctx, addr)
		if err != nil {
			return fmt.Errorf("get or create address: %w", err)
		}

		addr.ID = addressID
		supplier.AddressID = addressID

		supplier, err = s.repo.Create(ctx, supplier)
		if err != nil {
			return fmt.Errorf("create supplier: %w", err)
		}

		return nil
	})
	if err != nil {
		return Supplier{}, address.Address{}, err
	}

	return supplier, addr, nil
}

func (s *service) UpdateAddress(ctx context.Context, id uuid.UUID, addr address.Address) error {
	err := s.txManager.Do(ctx, func(ctx context.Context) error {
		addressID, err := s.addressRepo.GetOrCreate(ctx, addr)
		if err != nil {
			return fmt.Errorf("get or create address: %w", err)
		}

		return s.repo.UpdateAddress(ctx, id, addressID)
	})
	if err != nil {
		return fmt.Errorf("update supplier address: %w", err)
	}

	return nil
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetAll(ctx context.Context) ([]SupplierWithAddress, error) {
	return s.repo.GetAll(ctx)
}

func (s *service) GetByID(ctx context.Context, id uuid.UUID) (SupplierWithAddress, error) {
	return s.repo.GetByID(ctx, id)
}
