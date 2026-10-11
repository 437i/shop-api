package category

func ToResponse(model Category) Response {
	return Response{
		ID:   model.ID,
		Name: model.Name,
	}
}

func DTOToModel(dto CreateRequest) Category {
	return Category{
		Name: dto.Name,
	}
}

func ModelToDAO(model Category) CategoryDAO {
	return CategoryDAO{
		Name: model.Name,
	}
}
