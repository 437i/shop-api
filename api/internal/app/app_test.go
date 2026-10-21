package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"be2/internal/auth"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
	"go.uber.org/fx/fxtest"
)

func startMockAuthApp(t *testing.T) (*auth.Handler, *auth.Middleware) {
	t.Helper()

	var (
		handler    *auth.Handler
		middleware *auth.Middleware
	)

	application := fxtest.New(
		t,
		mockAuthModule,
		fx.Provide(auth.NewHandler),
		fx.Populate(&handler, &middleware),
	)
	application.RequireStart()
	t.Cleanup(application.RequireStop)

	return handler, middleware
}

func TestMockAuthModuleStarts(t *testing.T) {
	startMockAuthApp(t)
}

func TestMockAuthChangePasswordEndpoint(t *testing.T) {
	handler, middleware := startMockAuthApp(t)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/v1/auth", handler.Auth)

	protected := router.Group("/api/v1")
	protected.Use(middleware.Auth)
	protected.POST("/change", handler.ChangePassword)

	login := httptest.NewRecorder()
	loginRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/auth",
		strings.NewReader(`{"email":"admin@example.com","password":"secret"}`),
	)
	loginRequest.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(login, loginRequest)

	if login.Code != http.StatusOK {
		t.Fatalf("expected 200 from the mock login, got %d: %s", login.Code, login.Body.String())
	}

	var authResponse auth.Response
	if err := json.Unmarshal(login.Body.Bytes(), &authResponse); err != nil {
		t.Fatalf("failed to decode the mock login response: %v", err)
	}

	if authResponse.Token == "" {
		t.Fatal("expected the mock login to return a token")
	}

	change := httptest.NewRecorder()
	changeRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/change",
		strings.NewReader(`{"current_password":"old-secret","new_password":"new-secret"}`),
	)
	changeRequest.Header.Set("Content-Type", "application/json")
	changeRequest.Header.Set("Authorization", "Bearer "+authResponse.Token)
	router.ServeHTTP(change, changeRequest)

	if change.Code != http.StatusNoContent {
		t.Fatalf("expected 204 from the mock change password, got %d: %s", change.Code, change.Body.String())
	}

	foreign := httptest.NewRecorder()
	foreignRequest := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/change",
		strings.NewReader(`{"current_password":"old-secret","new_password":"new-secret"}`),
	)
	foreignRequest.Header.Set("Content-Type", "application/json")
	foreignRequest.Header.Set("Authorization", "Bearer some.other.token")
	router.ServeHTTP(foreign, foreignRequest)

	if foreign.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for a foreign token, got %d: %s", foreign.Code, foreign.Body.String())
	}
}
