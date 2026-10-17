package client

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"be2/internal/address"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestHandlerCreateSuccessResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	clientID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	addressID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	registrationDate := time.Date(2026, time.October, 17, 12, 0, 0, 0, time.UTC)

	created := Client{
		ID:               clientID,
		Name:             "Иван",
		Surname:          "Иванов",
		Birthday:         time.Date(1990, time.January, 1, 0, 0, 0, 0, time.UTC),
		Gender:           Male,
		RegistrationDate: registrationDate,
		AddressID:        addressID,
	}
	createdAddr := address.Address{
		ID:      addressID,
		Country: "Россия",
		City:    "Москва",
		Street:  "Ленина, 10",
	}

	router := gin.New()
	handler := NewHandler(&fakeService{created: created, createdAddr: createdAddr})
	router.POST("/clients", handler.Create)

	const body = `{"name":"Иван","surname":"Иванов","birthday":"1990-01-01","gender":"m","address":{"country":"Россия","city":"Москва","street":"Ленина, 10"}}`
	req := httptest.NewRequest(http.MethodPost, "/clients", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d (body %q)", rec.Code, http.StatusCreated, rec.Body.String())
	}

	var resp Response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}

	if resp.ID != clientID {
		t.Errorf("id = %v, want %v", resp.ID, clientID)
	}
	if resp.Name != created.Name {
		t.Errorf("name = %q, want %q", resp.Name, created.Name)
	}
	if resp.Surname != created.Surname {
		t.Errorf("surname = %q, want %q", resp.Surname, created.Surname)
	}
	if resp.Birthday != "1990-01-01" {
		t.Errorf("birthday = %q, want %q", resp.Birthday, "1990-01-01")
	}
	if resp.Gender != string(Male) {
		t.Errorf("gender = %q, want %q", resp.Gender, Male)
	}
	if !resp.RegistrationDate.Equal(registrationDate) {
		t.Errorf("registration_date = %v, want %v", resp.RegistrationDate, registrationDate)
	}
	if resp.Address.ID != addressID {
		t.Errorf("address.id = %v, want %v", resp.Address.ID, addressID)
	}
	if resp.Address.Country != createdAddr.Country ||
		resp.Address.City != createdAddr.City ||
		resp.Address.Street != createdAddr.Street {
		t.Errorf("address = %+v, want %+v", resp.Address, createdAddr)
	}
}
