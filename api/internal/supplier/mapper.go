package supplier

import (
	"be2/internal/address"
)

func DTOToModel(req CreateRequest) Supplier {
	return Supplier{
		Name:  req.Name,
		Phone: req.PhoneNumber,
	}
}

func ToResponse(modelSup Supplier, modelAddr address.Address) Response {
	return Response{
		ID:          modelSup.ID,
		Name:        modelSup.Name,
		Address:     address.ModelToDTO(modelAddr),
		PhoneNumber: modelSup.Phone,
	}
}

func ToListResponse(models []SupplierWithAddress) []Response {
	res := make([]Response, 0, len(models))
	for _, s := range models {
		res = append(res, ToResponse(s.Supplier, s.Address))
	}
	return res
}

func ToDAO(model Supplier) SupplierDAO {
	return SupplierDAO{
		Name:      model.Name,
		AddressID: model.AddressID,
		Phone:     model.Phone,
	}
}

func DAOToModel(dao SupplierDAO) Supplier {
	return Supplier{
		ID:        dao.ID,
		Name:      dao.Name,
		AddressID: dao.AddressID,
		Phone:     dao.Phone,
	}
}

func FullDAOToModel(dao SupplierFullDAO) SupplierWithAddress {
	return SupplierWithAddress{
		Supplier: Supplier{
			ID:        dao.ID,
			Name:      dao.Name,
			AddressID: dao.AddressID,
			Phone:     dao.Phone,
		},
		Address: address.Address{
			ID:      dao.AddressID,
			Country: dao.Country,
			City:    dao.City,
			Street:  dao.Street,
		},
	}
}

func ToListModels(daos []SupplierFullDAO) []SupplierWithAddress {
	res := make([]SupplierWithAddress, 0, len(daos))
	for _, d := range daos {
		res = append(res, FullDAOToModel(d))
	}
	return res
}
