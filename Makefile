.PHONY: help setup generate dev-app dev-agent clean

.DEFAULT_GOAL := help

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "\nAvailable targets:\n\n"} /^[a-zA-Z0-9_.-]+:.*## / { printf "  %-16s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## Install app and agent dependencies
	@echo "Setting up development environment..."
	cd app && npm install
	cd agent && go mod tidy

generate: ## Generate API clients and server scaffolding from OpenAPI
	@echo "Generating API clients and server scaffolding from OpenAPI spec..."
	@./scripts/generate.sh

dev-app: ## Start the Expo mobile app
	@echo "Starting Expo React Native app..."
	cd app && npx expo start

dev-agent: ## Start the Go backend agent
	@echo "Starting Go backend agent..."
	cd agent && go run cmd/server/main.go

clean: ## Remove local build artifacts
	@echo "Cleaning generated and local build files..."
	rm -rf app/node_modules
	rm -rf agent/bin/*