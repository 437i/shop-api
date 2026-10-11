package address

import "errors"

var (
	ErrCountryEmpty = errors.New("empty country")
	ErrCityEmpty    = errors.New("empty city")
	ErrStreetEmpty  = errors.New("empty street")
)
