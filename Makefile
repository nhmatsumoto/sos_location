.PHONY: up down build logs frontend-typecheck frontend-lint backend-test python-test checks

# Sobe todos os serviços, sempre rebuilda o frontend com o hash atual do git.
# Isso evita que o Docker reutilize cache de builds anteriores quando o código
# foi revertido para um commit anterior (git reset --hard).
up:
	BUILD_HASH=$(shell git rev-parse HEAD) docker compose up -d --build

# Rebuild apenas o frontend (mais rápido quando só o código front mudou)
build-frontend:
	BUILD_HASH=$(shell git rev-parse HEAD) docker compose build --no-cache frontend

# Derruba todos os containers
down:
	docker compose down

# Acompanha logs de todos os serviços
logs:
	docker compose logs -f

frontend-typecheck:
	cd frontend-react && bun x tsc -b --pretty false

frontend-lint:
	cd frontend-react && bun x eslint .

backend-test:
	DOTNET_CLI_HOME=/tmp/sos-location-dotnet-home DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 dotnet test backend-dotnet/SOSLocation.slnx --nologo

python-test:
	PYTHONPATH=risk-analysis-unit python3 -m unittest discover -s risk-analysis-unit/tests -p "test_*.py"

checks: frontend-typecheck frontend-lint backend-test python-test
