package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	authProto "be2/gen/auth"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GRPCClient struct {
	client authProto.AuthServiceClient
}

func NewGRPCClient(conn *grpc.ClientConn) *GRPCClient {
	return &GRPCClient{
		client: authProto.NewAuthServiceClient(conn),
	}
}

func fromGRPC(err error) error {
	st, ok := status.FromError(err)
	if !ok {
		return fmt.Errorf("%w: %v", ErrServiceError, err)
	}

	switch st.Code() {
	case codes.InvalidArgument:
		return fmt.Errorf("%w: %s", ErrInvalidData, st.Message())
	case codes.AlreadyExists:
		return ErrAlreadyExists
	case codes.NotFound:
		return ErrNotFound
	case codes.Unauthenticated:
		return ErrUnauthenticated
	case codes.Unavailable, codes.DeadlineExceeded:
		return fmt.Errorf("%w: %s", ErrUnavailable, st.Message())
	default:
		return fmt.Errorf("%w: %s", ErrServiceError, st.Message())
	}
}

func (c *GRPCClient) ValidateToken(ctx context.Context, token string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	resp, err := c.client.ValidateToken(
		ctx,
		&authProto.ValidateTokenRequest{
			Token: token,
		},
	)
	if err != nil {
		return false, fromGRPC(err)
	}

	return resp.GetValid(), nil
}

func (c *GRPCClient) Register(ctx context.Context, req RegisterRequest) (Response, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

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
		return Response{}, fromGRPC(err)
	}

	return Response{
		Token: resp.GetToken(),
	}, nil
}

func (c *GRPCClient) Login(ctx context.Context, req LoginRequest) (Response, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	resp, err := c.client.Login(
		ctx,
		&authProto.LoginRequest{
			Email:    req.Email,
			Password: req.Password,
		},
	)
	if err != nil {
		err = fromGRPC(err)
		if errors.Is(err, ErrNotFound) {
			err = ErrUnauthenticated
		}
		return Response{}, err
	}

	return Response{
		Token: resp.GetToken(),
	}, nil
}

func (c *GRPCClient) ResetPassword(ctx context.Context, req ResetRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := c.client.ResetPassword(
		ctx,
		&authProto.ResetPasswordRequest{
			Email: req.Email,
		},
	)
	if err != nil {
		err = fromGRPC(err)
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		return err
	}

	return nil
}

func (c *GRPCClient) ChangePassword(ctx context.Context, req ChangeRequest, token string) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := c.client.ChangePassword(
		ctx,
		&authProto.ChangePasswordRequest{
			Token:           token,
			CurrentPassword: req.CurrentPassword,
			NewPassword:     req.NewPassword,
		},
	)
	if err != nil {
		err = fromGRPC(err)
		if errors.Is(err, ErrUnauthenticated) {
			return ErrWrongPassword
		}
		return err
	}

	return nil
}
