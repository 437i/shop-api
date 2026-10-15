package request

import "net/http"

type Checker struct {
	client *http.Client
	target Target
}

type Target struct{}
