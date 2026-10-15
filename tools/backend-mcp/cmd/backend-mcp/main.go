package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/437i/shop-api/backend-mcp/internal/healthcheck"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
	server := mcp.NewServer(
		&mcp.Implementation{
			Name:    "backend-dev",
			Version: "0.1.0",
		},
		nil,
	)

	httpClient := healthcheck.NewHTTPClient(3 * time.Second)

	checker := healthcheck.NewChecker(httpClient, healthcheck.DefaultTargets())

	healthcheck.Register(server, checker)

	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Printf("MCP server stopped: %v", err)
		os.Exit(1)
	}
}
