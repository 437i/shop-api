package image

func ToCreateResponse(model Image) CreateResponse {
	return CreateResponse{
		ID: model.ID,
	}
}

func DAOToModel(dao ImageDAO) Image {
	return Image{
		ID:   dao.ID,
		Data: dao.Image,
	}
}
