package response

import "github.com/gin-gonic/gin"

type ErrorResponse struct {
	Message string `json:"message" example:"resource not found"`
}

func Error(c *gin.Context, status int, message string) {
	c.JSON(status, ErrorResponse{
		Message: message,
	})
}
