package product

import (
	"be2/internal/address"
	"be2/internal/category"
	"be2/internal/supplier"
	"fmt"

	"github.com/shopspring/decimal"
)

func DTOToModel(dto CreateRequest) (Product, error) {
	price, err := decimal.NewFromString(dto.Price)
	if err != nil {
		return Product{}, fmt.Errorf("%w: %v", ErrPriceInvalid, err)
	}

	return Product{
		Name:           dto.Name,
		Price:          price,
		AvailableStock: dto.AvailableStock,
		SupplierID:     dto.SupplierID,
	}, nil
}

func ToCreateResponse(model Product) CreateResponse {
	return CreateResponse{
		ID:             model.ID,
		Name:           model.Name,
		CategoryID:     model.CategoryID,
		Price:          model.Price.StringFixed(2),
		AvailableStock: model.AvailableStock,
		LastUpdateDate: model.LastUpdateDate,
		SupplierID:     model.SupplierID,
		ImageID:        model.ImageID,
	}
}

func ToFullResponse(model ProductFull) FullResponse {
	return FullResponse{
		ID:             model.Product.ID,
		Name:           model.Product.Name,
		Category:       category.ToResponse(model.Category),
		Price:          model.Product.Price.StringFixed(2),
		AvailableStock: model.Product.AvailableStock,
		LastUpdateDate: model.Product.LastUpdateDate,
		Supplier:       supplier.ToResponse(model.Supplier.Supplier, model.Supplier.Address),
		ImageID:        model.Product.ImageID,
	}
}

func WithCategoryToResponse(model ProductWithCategory) ListResponse {
	return ListResponse{
		ID:             model.Product.ID,
		Name:           model.Product.Name,
		Category:       category.ToResponse(model.Category),
		Price:          model.Product.Price.StringFixed(2),
		AvailableStock: model.Product.AvailableStock,
		ImageID:        model.Product.ImageID,
	}
}

func ToListResponse(models []ProductWithCategory) []ListResponse {
	res := make([]ListResponse, 0, len(models))
	for _, m := range models {
		res = append(res, WithCategoryToResponse(m))
	}
	return res
}

func ToDAO(model Product) ProductDAO {
	return ProductDAO{
		Name:           model.Name,
		CategoryID:     model.CategoryID,
		Price:          model.Price,
		AvailableStock: model.AvailableStock,
		SupplierID:     model.SupplierID,
	}
}

func DAOToModel(dao ProductDAO) Product {
	return Product{
		ID:             dao.ID,
		Name:           dao.Name,
		CategoryID:     dao.CategoryID,
		Price:          dao.Price,
		AvailableStock: dao.AvailableStock,
		LastUpdateDate: dao.LastUpdateDate,
		SupplierID:     dao.SupplierID,
		ImageID:        dao.ImageID,
	}
}

func FullDAOToModel(dao ProductFullDAO) ProductFull {
	return ProductFull{
		Product: Product{
			ID:             dao.ID,
			Name:           dao.Name,
			CategoryID:     dao.CategoryID,
			Price:          dao.Price,
			AvailableStock: dao.AvailableStock,
			LastUpdateDate: dao.LastUpdateDate,
			SupplierID:     dao.SupplierID,
			ImageID:        dao.ImageID,
		},
		Category: category.Category{
			ID:   dao.CategoryID,
			Name: dao.CategoryName,
		},
		Supplier: supplier.SupplierWithAddress{
			Supplier: supplier.Supplier{
				ID:        dao.SupplierID,
				Name:      dao.SupplierName,
				AddressID: dao.AddressID,
				Phone:     dao.PhoneNumber,
			},
			Address: address.Address{
				ID:      dao.AddressID,
				Country: dao.Country,
				City:    dao.City,
				Street:  dao.Street,
			},
		},
	}
}

func WithCategoryDAOToModel(dao ProductWithCategoryDAO) ProductWithCategory {
	return ProductWithCategory{
		Product: Product{
			ID:             dao.ID,
			Name:           dao.Name,
			CategoryID:     dao.CategoryID,
			Price:          dao.Price,
			AvailableStock: dao.AvailableStock,
			LastUpdateDate: dao.LastUpdateDate,
			SupplierID:     dao.SupplierID,
			ImageID:        dao.ImageID,
		},
		Category: category.Category{
			ID:   dao.CategoryID,
			Name: dao.CategoryName,
		},
	}
}

func WithCategoryListToModels(daos []ProductWithCategoryDAO) []ProductWithCategory {
	res := make([]ProductWithCategory, 0, len(daos))
	for _, d := range daos {
		res = append(res, WithCategoryDAOToModel(d))
	}
	return res
}
