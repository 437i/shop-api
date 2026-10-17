package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"be2/internal/address"
	"be2/internal/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestMapErrToHTTP(t *testing.T) {
	tests := []struct {
		name        string
		err         error
		wantMessage string
	}{
		{name: "too young", err: ErrTooYoung, wantMessage: "client can't be younger than 16 years"},
		{name: "too old", err: ErrTooOld, wantMessage: "client can't be older than 100 years"},
		{name: "time travel", err: ErrTimeTravel, wantMessage: "time travellers not welcome"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, msg := MapErrToHTTP(tt.err)
			if code != http.StatusBadRequest {
				t.Fatalf("code = %d, want %d", code, http.StatusBadRequest)
			}
			if msg != tt.wantMessage {
				t.Fatalf("message = %q, want %q", msg, tt.wantMessage)
			}
		})
	}

	for _, tt := range tests {
		t.Run("wrapped "+tt.name, func(t *testing.T) {
			code, msg := MapErrToHTTP(fmt.Errorf("validate bday: %w", tt.err))
			if code != http.StatusBadRequest {
				t.Fatalf("code = %d, want %d", code, http.StatusBadRequest)
			}
			if !strings.Contains(msg, tt.wantMessage) {
				t.Fatalf("message = %q, want it to contain %q", msg, tt.wantMessage)
			}
		})
	}
}

type fakeService struct {
	createErr   error
	created     Client
	createdAddr address.Address
}

func (f *fakeService) Create(ctx context.Context, client Client, addr address.Address) (Client, address.Address, error) {
	if f.createErr != nil {
		return Client{}, address.Address{}, f.createErr
	}
	return f.created, f.createdAddr, nil
}

func (f *fakeService) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (f *fakeService) GetList(ctx context.Context, params ListFilter) ([]ClientWithAddress, error) {
	return nil, nil
}

func (f *fakeService) UpdateAddress(ctx context.Context, id uuid.UUID, addr address.Address) error {
	return nil
}

func TestHandlerCreateAgeErrorResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name        string
		err         error
		wantMessage string
	}{
		{name: "too young", err: ErrTooYoung, wantMessage: "client can't be younger than 16 years"},
		{name: "too old", err: ErrTooOld, wantMessage: "client can't be older than 100 years"},
		{name: "time travel", err: ErrTimeTravel, wantMessage: "time travellers not welcome"},
	}

	const body = `{"name":"Иван","surname":"Иванов","birthday":"1990-01-01","gender":"m","address":{"country":"Россия","city":"Москва","street":"Ленина, 10"}}`

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			handler := NewHandler(&fakeService{createErr: fmt.Errorf("validate bday: %w", tt.err)})
			router.POST("/clients", handler.Create)

			req := httptest.NewRequest(http.MethodPost, "/clients", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
			}

			var resp response.ErrorResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("decode body %q: %v", rec.Body.String(), err)
			}
			if resp.Message == "" {
				t.Fatalf("body %q has no message field", rec.Body.String())
			}
			if !strings.Contains(resp.Message, tt.wantMessage) {
				t.Fatalf("message = %q, want it to contain %q", resp.Message, tt.wantMessage)
			}
		})
	}
}
