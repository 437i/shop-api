package supplier

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestMapDeleteError(t *testing.T) {
	tests := []struct {
		name      string
		err       error
		wantInUse bool
	}{
		{
			name:      "restrict violation 23001",
			err:       &pgconn.PgError{Code: pgerrcode.RestrictViolation},
			wantInUse: true,
		},
		{
			name:      "wrapped restrict violation 23001",
			err:       fmt.Errorf("execute delete query: %w", &pgconn.PgError{Code: pgerrcode.RestrictViolation}),
			wantInUse: true,
		},
		{
			name:      "foreign key violation 23503",
			err:       &pgconn.PgError{Code: pgerrcode.ForeignKeyViolation},
			wantInUse: true,
		},
		{
			name:      "wrapped foreign key violation 23503",
			err:       fmt.Errorf("execute delete query: %w", &pgconn.PgError{Code: pgerrcode.ForeignKeyViolation}),
			wantInUse: true,
		},
		{
			name: "unique violation 23505",
			err:  &pgconn.PgError{Code: pgerrcode.UniqueViolation},
		},
		{
			name: "empty code",
			err:  &pgconn.PgError{Code: ""},
		},
		{
			name: "non postgres error",
			err:  errors.New("connection reset"),
		},
		{
			name: "wrapped non postgres error",
			err:  fmt.Errorf("exec: %w", errors.New("connection reset")),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mapDeleteError(tt.err)

			if got := errors.Is(err, ErrSupplierInUse); got != tt.wantInUse {
				t.Fatalf("errors.Is(err, ErrSupplierInUse) = %v, want %v (err %q)", got, tt.wantInUse, err)
			}

			if !tt.wantInUse && !strings.HasPrefix(err.Error(), "execute delete query") {
				t.Fatalf("err = %q, want prefix %q", err, "execute delete query")
			}
		})
	}
}
