package address

func DTOToModel(req CreateRequest) Address {
	return Address{
		Country: req.Country,
		City:    req.City,
		Street:  req.Street,
	}
}

func ModelToDTO(address Address) Response {
	return Response{
		ID:      address.ID,
		Country: address.Country,
		City:    address.City,
		Street:  address.Street,
	}
}

func ModelToDAO(address Address) AddressDAO {
	return AddressDAO{
		Country: address.Country,
		City:    address.City,
		Street:  address.Street,
	}
}
