package healthcheck

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type input struct{}

func Register(server *mcp.Server, checker *Checker) {
	mcp.AddTool(
		server,
		&mcp.Tool{
			Name: "backend_healthcheck",
			Description: "Check availability of the configured local " +
				"Go API instances and Nginx.",
		},
		func(ctx context.Context, _ *mcp.CallToolRequest, _ input) (*mcp.CallToolResult, Report, error) {
			report := checker.Check(ctx)
			return nil, report, nil
		},
	)
}
