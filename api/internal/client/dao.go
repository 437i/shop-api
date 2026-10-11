package client

import (
	"time"

	"github.com/google/uuid"
)

type ClientDAO struct {
	ID               uuid.UUID `db:"id"`
	ClientName       string    `db:"client_name"`
	ClientSurname    string    `db:"client_surname"`
	Birthday         time.Time `db:"birthday"`
	Gender           string    `db:"gender"`
	RegistrationDate time.Time `db:"registration_date"`
	AddressID        uuid.UUID `db:"address_id"`
}

type ClientFullDAO struct {
	ID               uuid.UUID `db:"id"`
	ClientName       string    `db:"client_name"`
	ClientSurname    string    `db:"client_surname"`
	Birthday         time.Time `db:"birthday"`
	Gender           string    `db:"gender"`
	RegistrationDate time.Time `db:"registration_date"`
	AddressID        uuid.UUID `db:"address_id"`
	Country          string    `db:"country"`
	City             string    `db:"city"`
	Street           string    `db:"street"`
}

const table = "clients"

const (
	idCol               = "id"
	nameCol             = "client_name"
	surnameCol          = "client_surname"
	birthdayCol         = "birthday"
	genderCol           = "gender"
	registrationDateCol = "registration_date"
	addressIDCol        = "address_id"
)
