package auth

import (
	"context"

	authProto "be2/gen/auth"

	"google.golang.org/grpc"
)

type GRPCClient struct {
	client authProto.AuthServiceClient
}

func NewGRPCClient(conn *grpc.ClientConn) *GRPCClient {
	return &GRPCClient{
		client: authProto.NewAuthServiceClient(conn),
	}
}

func (c *GRPCClient) ValidateToken(ctx context.Context, token string) (bool, error) {
	resp, err := c.client.ValidateToken(
		ctx,
		&authProto.ValidateTokenRequest{
			Token: token,
		},
	)
	if err != nil {
		return false, err
	}

	return resp.GetValid(), nil
}

func (c *GRPCClient) Register(ctx context.Context, req RegisterRequest) (Response, error) {
	resp, err := c.client.Register(
		ctx,
		&authProto.RegisterRequest{
			Name:     req.Name,
			Surname:  req.Surname,
			Email:    req.Email,
			Phone:    req.Phone,
			Password: req.Password,
		},
	)
	if err != nil {
		return Response{}, err
	}

	return Response{
		Token: resp.GetToken(),
	}, nil
}

func (c *GRPCClient) Login(ctx context.Context, req LoginRequest) (Response, error) {
	resp, err := c.client.Login(
		ctx,
		&authProto.LoginRequest{
			Email:    req.Email,
			Password: req.Password,
		},
	)
	if err != nil {
		return Response{}, err
	}

	return Response{
		Token: resp.GetToken(),
	}, nil
}

func (c *GRPCClient) ResetPassword(ctx context.Context, req ResetRequest) error {
	_, err := c.client.ResetPassword(
		ctx,
		&authProto.ResetPasswordRequest{
			Email: req.Email,
		},
	)
	return err
}
