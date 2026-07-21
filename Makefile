.PHONY: up down logs build test test-unit test-integration test-arch test-web fixture api-dev worker-dev web-dev migrate

up: ## Sobe a plataforma completa (web em http://localhost:8080)
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

build:
	dotnet build SosLocation.slnx
	cd apps/web && npm run build

test: test-unit test-arch test-web

test-unit:
	dotnet test tests/SosLocation.UnitTests --nologo

test-arch:
	dotnet test tests/SosLocation.ArchitectureTests --nologo

test-integration: ## Requer Docker (Testcontainers + PostGIS real)
	dotnet test tests/SosLocation.IntegrationTests --nologo

test-web:
	cd apps/web && npx vitest run

e2e: ## Requer a stack no ar (make up) e browsers do Playwright instalados
	cd apps/web && npx playwright test

fixture: ## Regenera a fixture offline Demo District
	python tools/fixtures/generate_fixture.py

migrate: ## Gera uma nova migration (ex.: make migrate NAME=AddSomething)
	dotnet ef migrations add $(NAME) -p src/SosLocation.Infrastructure -s src/SosLocation.Infrastructure -o Persistence/Migrations

api-dev: ## API local em http://localhost:5080 (requer postgres/minio: docker compose up postgres minio)
	dotnet run --project src/SosLocation.Api --urls http://localhost:5080

worker-dev:
	dotnet run --project src/SosLocation.Worker

web-dev: ## Vite dev server em http://localhost:5173 (proxy /api -> :5080)
	cd apps/web && npm run dev
