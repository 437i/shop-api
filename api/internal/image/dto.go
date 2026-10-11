package image

import "github.com/google/uuid"

type CreateResponse struct {
	ID uuid.UUID `json:"id"`
}
