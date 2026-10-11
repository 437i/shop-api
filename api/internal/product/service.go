package product

import (
	"be2/internal/category"
	"be2/internal/database"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, product Product) (Product, error)
	DecreaseStock(ctx context.Context, id uuid.UUID, amount int) error
	GetByID(ctx context.Context, id uuid.UUID) (ProductFull, error)
	GetAll(ctx context.Context) ([]ProductWithCategory, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type service struct {
	repo         Repository
	categoryRepo category.Repository
	txManager    database.Transactor
}

func NewService(repo Repository, categoryRepo category.Repository, txManager database.Transactor) *service {
	return &service{
		repo:         repo,
		categoryRepo: categoryRepo,
		txManager:    txManager,
	}
}

func (s *service) Create(ctx context.Context, product Product, category category.Category) (Product, error) {
	err := s.txManager.Do(ctx, func(ctx context.Context) error {
		categoryID, err := s.categoryRepo.GetOrCreate(ctx, category)
		if err != nil {
			return fmt.Errorf("get or create category: %w", err)
		}

		product.CategoryID = categoryID

		product, err = s.repo.Create(ctx, product)
		if err != nil {
			return fmt.Errorf("create product: %w", err)
		}

		return nil
	})
	if err != nil {
		return Product{}, err
	}

	return product, nil
}

func (s *service) DecreaseStock(ctx context.Context, id uuid.UUID, amount int) error {
	return s.repo.DecreaseStock(ctx, id, amount)
}

func (s *service) GetByID(ctx context.Context, id uuid.UUID) (ProductFull, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) GetAll(ctx context.Context) ([]ProductWithCategory, error) {
	return s.repo.GetAll(ctx)
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
