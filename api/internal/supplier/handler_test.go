package supplier

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"be2/internal/address"
	"be2/internal/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type fakeService struct {
	deleteErr   error
	deleteCalls int
}

func (f *fakeService) Create(ctx context.Context, supplier Supplier, addr address.Address) (Supplier, address.Address, error) {
	return Supplier{}, address.Address{}, nil
}

func (f *fakeService) UpdateAddress(ctx context.Context, id uuid.UUID, addr address.Address) error {
	return nil
}

func (f *fakeService) Delete(ctx context.Context, id uuid.UUID) error {
	f.deleteCalls++
	return f.deleteErr
}

func (f *fakeService) GetAll(ctx context.Context) ([]SupplierWithAddress, error) {
	return nil, nil
}

func (f *fakeService) GetByID(ctx context.Context, id uuid.UUID) (SupplierWithAddress, error) {
	return SupplierWithAddress{}, nil
}

func TestHandlerDelete(t *testing.T) {
	gin.SetMode(gin.TestMode)

	supplierID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	tests := []struct {
		name        string
		pathID      string
		deleteErr   error
		wantStatus  int
		wantMessage string
		wantNoBody  bool
		wantNoCall  bool
	}{
		{
			name:        "supplier in use",
			pathID:      supplierID.String(),
			deleteErr:   ErrSupplierInUse,
			wantStatus:  http.StatusBadRequest,
			wantMessage: "supplier is used by products",
		},
		{
			name:        "unexpected service error",
			pathID:      supplierID.String(),
			deleteErr:   errors.New("boom"),
			wantStatus:  http.StatusInternalServerError,
			wantMessage: "internal server error",
		},
		{
			name:        "supplier not found",
			pathID:      supplierID.String(),
			deleteErr:   ErrNotFound,
			wantStatus:  http.StatusNotFound,
			wantMessage: "supplier not found",
		},
		{
			name:       "success",
			pathID:     supplierID.String(),
			wantStatus: http.StatusNoContent,
			wantNoBody: true,
		},
		{
			name:        "invalid id",
			pathID:      "not-a-uuid",
			wantStatus:  http.StatusBadRequest,
			wantMessage: "invalid supplier id",
			wantNoCall:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := &fakeService{deleteErr: tt.deleteErr}
			router := gin.New()
			router.DELETE("/suppliers/:id", NewHandler(fake).Delete)

			req := httptest.NewRequest(http.MethodDelete, "/suppliers/"+tt.pathID, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tt.wantStatus, rec.Body.String())
			}

			if tt.wantNoBody {
				if rec.Body.Len() != 0 {
					t.Fatalf("body = %q, want empty", rec.Body.String())
				}
			} else {
				var resp response.ErrorResponse
				if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
					t.Fatalf("decode body %q: %v", rec.Body.String(), err)
				}
				if resp.Message != tt.wantMessage {
					t.Fatalf("message = %q, want %q", resp.Message, tt.wantMessage)
				}
			}

			if tt.wantNoCall && fake.deleteCalls != 0 {
				t.Fatalf("service delete calls = %d, want 0", fake.deleteCalls)
			}
		})
	}
}
