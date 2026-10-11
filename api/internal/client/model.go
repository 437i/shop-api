package client

import (
	"be2/internal/address"
	"time"

	"github.com/google/uuid"
)

type Gender string

const (
	Male   Gender = "m"
	Female Gender = "f"
	Other  Gender = "n/a"
)

type Client struct {
	ID               uuid.UUID
	Name             string
	Surname          string
	Birthday         time.Time
	Gender           Gender
	RegistrationDate time.Time
	AddressID        uuid.UUID
}

type ClientWithAddress struct {
	Client  Client
	Address address.Address
}

type ListFilter struct {
	Name    string
	Surname string
	Limit   *int
	Offset  *int
}
