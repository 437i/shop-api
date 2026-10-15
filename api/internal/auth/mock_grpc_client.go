package auth

import "context"

const devMockToken = "some.mOck.Token"

type Mock struct {
	mockToken string
}

func NewMock() *Mock {
	return &Mock{mockToken: devMockToken}
}

func (m *Mock) ValidateToken(_ context.Context, token string) (bool, error) {
	if token != m.mockToken {
		return false, nil
	}
	return true, nil
}

func (m *Mock) Register(_ context.Context, _ RegisterRequest) (Response, error) {
	return Response{Token: m.mockToken}, nil
}

func (m *Mock) Login(_ context.Context, _ LoginRequest) (Response, error) {
	return Response{Token: m.mockToken}, nil
}

func (m *Mock) ResetPassword(_ context.Context, _ ResetRequest) error {
	return nil
}
