package image

import (
	"be2/internal/database"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type Repository interface {
	Insert(ctx context.Context, data []byte) (Image, error)
	Change(ctx context.Context, id uuid.UUID, data []byte) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (Image, error)
	GetByProductID(ctx context.Context, productID uuid.UUID) (Image, error)
}

type ProductImageSetter interface {
	SetImage(ctx context.Context, productID, imageID uuid.UUID) error
}

type service struct {
	repo        Repository
	productRepo ProductImageSetter
	txManager   database.Transactor
}

func NewService(repo Repository, productRepo ProductImageSetter, txManager database.Transactor) *service {
	return &service{
		repo:        repo,
		productRepo: productRepo,
		txManager:   txManager,
	}
}

func (s *service) Create(ctx context.Context, productID uuid.UUID, data []byte) (Image, error) {
	var img Image

	err := s.txManager.Do(ctx, func(ctx context.Context) error {
		var err error

		img, err = s.repo.Insert(ctx, data)
		if err != nil {
			return fmt.Errorf("insert image: %w", err)
		}

		if err := s.productRepo.SetImage(ctx, productID, img.ID); err != nil {
			return fmt.Errorf("set image for product: %w", err)
		}

		return nil
	})
	if err != nil {
		return Image{}, err
	}

	return img, nil
}

func (s *service) Change(ctx context.Context, id uuid.UUID, data []byte) error {
	return s.repo.Change(ctx, id, data)
}

func (s *service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetByID(ctx context.Context, id uuid.UUID) (Image, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *service) GetByProductID(ctx context.Context, productID uuid.UUID) (Image, error) {
	return s.repo.GetByProductID(ctx, productID)
}
