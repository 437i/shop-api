package category

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	GetOrCreate(ctx context.Context, category Category) (uuid.UUID, error)
}
