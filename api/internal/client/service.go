package client

import (
	"be2/internal/address"
	"be2/internal/database"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, client Client) (Client, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetList(ctx context.Context, params ListFilter) ([]ClientWithAddress, error)
	UpdateAddress(ctx context.Context, id uuid.UUID, addressID uuid.UUID) error
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

func validateBirthday(bday time.Time) error {
	now := time.Now()
	switch {
	case bday.After(now):
		return ErrTimeTravel
	case bday.Before(now.AddDate(-100, 0, 0)):
		return ErrTooOld
	case bday.After(now.AddDate(-16, 0, 0)):
		return ErrTooYoung
	}
	return nil
}

func (s *service) Create(ctx context.Context, client Client, addr address.Address) (Client, address.Address, error) {
	if err := validateBirthday(client.Birthday); err != nil {
		return Client{}, address.Address{}, fmt.Errorf("validate bday: %w", err)
	}

	err := s.txManager.Do(ctx, func(ctx context.Context) error {
		addressID, err := s.addressRepo.GetOrCreate(ctx, addr)
		if err != nil {
			return fmt.Errorf("get or create address: %w", err)
		}
		addr.ID = addressID
		client.AddressID = addressID
		client, err = s.repo.Create(ctx, client)
		if err != nil {
			return fmt.Errorf("create client: %w", err)
		}
		return nil
	})
	if err != nil {
		return Client{}, address.Address{}, err
	}

	return client, addr, nil
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetList(ctx context.Context, params ListFilter) ([]ClientWithAddress, error) {
	return s.repo.GetList(ctx, params)
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
		return fmt.Errorf("update client address: %w", err)
	}

	return nil
}
