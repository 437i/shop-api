GOOSE_VERSION := v3.27.1

UNAME := $(shell uname -s 2>/dev/null)
WSL := $(shell grep -qi microsoft /proc/version 2>/dev/null && echo yes)

ifeq ($(WSL),yes)
OPEN := cmd.exe /c start
else ifeq ($(UNAME),Darwin)
OPEN := open
else ifeq ($(UNAME),Linux)
OPEN := xdg-open
else
OPEN := cmd /c start
endif

SWAGGER_URL := http://localhost:8080/swagger/index.html

.PHONY: run open reset migrate migrate_down migrate_reset db_up db_down swagger

run: migrate
	@( \
		for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
			if curl -fs $(SWAGGER_URL) >/dev/null 2>&1; then \
				$(OPEN) $(SWAGGER_URL) >/dev/null 2>&1; \
				exit 0; \
			fi; \
			sleep 1; \
		done \
	) &
	go run cmd/api/main.go

open:
	$(OPEN) $(SWAGGER_URL) >/dev/null 2>&1

reset: migrate_reset db_down

migrate: db_up
	go run github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION) up

migrate_down: db_up
	go run github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION) down

migrate_reset: db_up
	go run github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION) down-to 0

db_up:
	docker compose up -d --wait

db_down:
	docker compose down

swagger:
	go run github.com/swaggo/swag/cmd/swag init -g ./cmd/api/main.go -o ./docs --parseDependency --parseInternal