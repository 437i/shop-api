package healthcheck

import "time"

type Report struct {
	Status    string         `json:"status"`
	CheckedAt time.Time      `json:"checked_at"`
	Checks    []ServiceCheck `json:"checks"`
}

type ServiceCheck struct {
	Service    string `json:"service"`
	URL        string `json:"url"`
	Status     string `json:"status"`
	HTTPStatus int    `json:"http_status,omitempty"`
	LatencyMS  int64  `json:"latency_ms"`
	Error      string `json:"error,omitempty"`
}

type Target struct {
	Name string
	URL  string
}
