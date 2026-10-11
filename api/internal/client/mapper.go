package client

import (
	"be2/internal/address"
	"fmt"
	"time"
)

func DTOToModel(req CreateRequest) (Client, error) {
	birthday, err := time.Parse(time.DateOnly, req.Birthday)
	if err != nil {
		return Client{}, fmt.Errorf("%w: %v", ErrInvalidBirthday, err)
	}
	return Client{
		Name:     req.Name,
		Surname:  req.Surname,
		Birthday: birthday,
		Gender:   Gender(req.Gender),
	}, nil
}

func ToResponse(modelClient Client, modelAddr address.Address) Response {
	return Response{
		ID:               modelClient.ID,
		Name:             modelClient.Name,
		Surname:          modelClient.Surname,
		Birthday:         modelClient.Birthday.Format(time.DateOnly),
		Gender:           string(modelClient.Gender),
		RegistrationDate: modelClient.RegistrationDate,
		Address:          address.ModelToDTO(modelAddr),
	}
}

func ToListResponse(models []ClientWithAddress) []Response {
	res := make([]Response, 0, len(models))
	for _, client := range models {
		res = append(res, ToResponse(client.Client, client.Address))
	}
	return res
}

func FullDAOToModel(dao ClientFullDAO) ClientWithAddress {
	return ClientWithAddress{
		Client: Client{
			ID:               dao.ID,
			Name:             dao.ClientName,
			Surname:          dao.ClientSurname,
			Birthday:         dao.Birthday,
			Gender:           Gender(dao.Gender),
			RegistrationDate: dao.RegistrationDate,
			AddressID:        dao.AddressID,
		},
		Address: address.Address{
			ID:      dao.AddressID,
			Country: dao.Country,
			City:    dao.City,
			Street:  dao.Street,
		},
	}
}

func ToListModels(daos []ClientFullDAO) []ClientWithAddress {
	res := make([]ClientWithAddress, 0, len(daos))
	for _, client := range daos {
		res = append(res, FullDAOToModel(client))
	}
	return res
}

func ToDAO(model Client) ClientDAO {
	return ClientDAO{
		ClientName:    model.Name,
		ClientSurname: model.Surname,
		Birthday:      model.Birthday,
		Gender:        string(model.Gender),
		AddressID:     model.AddressID,
	}
}

func DAOToModel(dao ClientDAO) Client {
	return Client{
		ID:               dao.ID,
		Name:             dao.ClientName,
		Surname:          dao.ClientSurname,
		Birthday:         dao.Birthday,
		Gender:           Gender(dao.Gender),
		RegistrationDate: dao.RegistrationDate,
		AddressID:        dao.AddressID,
	}
}

func ToFilter(q ListQuery) ListFilter {
	return ListFilter{
		Name:    q.Name,
		Surname: q.Surname,
		Limit:   q.Limit,
		Offset:  q.Offset,
	}
}
