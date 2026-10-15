package healthcheck

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Checker struct {
	client  *http.Client
	targets []Target
}

func NewHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		CheckRedirect: func(
			_ *http.Request,
			_ []*http.Request,
		) error {
			return http.ErrUseLastResponse
		},
	}
}

func NewChecker(client *http.Client, targets []Target) *Checker {
	return &Checker{
		client:  client,
		targets: append([]Target(nil), targets...),
	}
}

func DefaultTargets() []Target {
	return []Target{
		{
			Name: "api",
			URL:  "http://127.0.0.1:8080/swagger/index.html",
		},
		{
			Name: "api-ro-1",
			URL:  "http://127.0.0.1:8081/swagger/index.html",
		},
		{
			Name: "api-ro-2",
			URL:  "http://127.0.0.1:8082/swagger/index.html",
		},
		{
			Name: "nginx",
			URL:  "http://127.0.0.1/status",
		},
	}
}

func (c *Checker) Check(ctx context.Context) Report {
	result := Report{
		Status:    "healthy",
		CheckedAt: time.Now().UTC(),
		Checks:    make([]ServiceCheck, 0, len(c.targets)),
	}

	for _, target := range c.targets {
		check := checkEndpoint(ctx, c.client, target)
		result.Checks = append(result.Checks, check)

		if check.Status != "ok" {
			result.Status = "degraded"
		}
	}

	return result
}

func checkEndpoint(ctx context.Context, client *http.Client, target Target) (result ServiceCheck) {
	result = ServiceCheck{
		Service: target.Name,
		URL:     target.URL,
		Status:  "error",
	}

	startedAt := time.Now()
	defer func() {
		result.LatencyMS = time.Since(startedAt).Milliseconds()
	}()

	if err := validateLocalURL(target.URL); err != nil {
		result.Error = err.Error()
		return result
	}

	checkCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	request, err := http.NewRequestWithContext(
		checkCtx,
		http.MethodGet,
		target.URL,
		nil,
	)
	if err != nil {
		result.Error = fmt.Sprintf("create request: %v", err)
		return result
	}

	response, err := client.Do(request)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	defer response.Body.Close()

	// Нам нужны статус и время ответа, а не содержимое страницы.
	// Ограничиваем чтение тела ответа.
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 8192))

	result.HTTPStatus = response.StatusCode

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		result.Status = "unhealthy"
		result.Error = fmt.Sprintf(
			"unexpected HTTP status: %d %s",
			response.StatusCode,
			http.StatusText(response.StatusCode),
		)
		return result
	}

	result.Status = "ok"
	return result
}

func validateLocalURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	if parsed.Scheme != "http" ||
		parsed.Host == "" ||
		parsed.User != nil {
		return fmt.Errorf("only local HTTP URLs are allowed")
	}

	host := strings.ToLower(parsed.Hostname())
	ip := net.ParseIP(host)

	if host != "localhost" &&
		(ip == nil || !ip.IsLoopback()) {
		return fmt.Errorf("non-loopback host is not allowed")
	}

	return nil
}
