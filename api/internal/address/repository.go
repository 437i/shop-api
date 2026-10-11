package address

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	GetOrCreate(ctx context.Context, address Address) (uuid.UUID, error)
}
