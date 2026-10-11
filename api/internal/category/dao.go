package category

import "github.com/google/uuid"

type CategoryDAO struct {
	ID   uuid.UUID
	Name string
}

const Table = "categories"

const (
	IDCol   = "id"
	NameCol = "name"
)
