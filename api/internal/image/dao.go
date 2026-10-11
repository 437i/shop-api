package image

import "github.com/google/uuid"

type ImageDAO struct {
	ID    uuid.UUID `db:"id"`
	Image []byte    `db:"image"`
}

const table = "images"

const (
	idCol    = "id"
	imageCol = "image"
)
