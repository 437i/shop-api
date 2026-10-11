package address

import "github.com/google/uuid"

type AddressDAO struct {
	ID      uuid.UUID
	Country string
	City    string
	Street  string
}

const Table = "addresses"

const (
	IDCol      = "id"
	CountryCol = "country"
	CityCol    = "city"
	StreetCol  = "street"
)
