# --- builder ---
FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go install github.com/pressly/goose/v3/cmd/goose@v3.28.0
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./cmd/api

# --- api runtime ---
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/api /app/api
EXPOSE 8080
CMD ["/app/api"]

# --- migration runtime ---
FROM alpine:3.20 AS migrate
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /go/bin/goose /usr/local/bin/goose
COPY --from=builder /src/migrations /app/migrations
ENTRYPOINT [ "goose" ]