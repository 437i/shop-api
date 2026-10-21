package auth

import (
	"context"
	"errors"
	"testing"
)

func TestMockChangePasswordAcceptsMockToken(t *testing.T) {
	mock := NewMock()

	if err := mock.ChangePassword(context.Background(), ChangeRequest{}, mock.mockToken); err != nil {
		t.Fatalf("expected the mock token to be accepted, got %v", err)
	}
}

func TestMockChangePasswordRejectsForeignToken(t *testing.T) {
	mock := NewMock()

	err := mock.ChangePassword(context.Background(), ChangeRequest{}, "some.other.token")
	if !errors.Is(err, ErrWrongPassword) {
		t.Fatalf("expected ErrWrongPassword for a foreign token, got %v", err)
	}
}
