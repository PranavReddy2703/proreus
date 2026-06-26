#!/usr/bin/env bash
set -e

echo "Generating React Native API client..."
cd app && npx @hey-api/openapi-ts
cd ..

echo "Generating Go Echo server scaffolding..."
cd agent
go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen -generate types,server -package generated ../api/openapi.yaml > internal/api/generated/api.gen.go
cd ..

echo "Generation complete!"
