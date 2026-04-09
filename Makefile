.DEFAULT_GOAL := help
.PHONY: docker-build docker-up build start log stop restart db-push db-generate

DOCKER_COMPOSE_DEV=docker compose -f docker-compose-dev.yml  --env-file .env
DOCKER_COMPOSE_PROD=docker compose -f docker-compose-prod.yml --env-file ./api/.env --env-file ./frontend/.env

# Dev commands

# Start relevant docker containers and run frontend and backend in separate screen
start:
	$(DOCKER_COMPOSE_DEV) up -d
#	screen -d -m -S mastopod-frontend cd frontend && yarn run dev
#	screen -d -m -S mastopod-backend cd backend && yarn run dev

stop:
	$(DOCKER_COMPOSE_DEV) kill
	$(DOCKER_COMPOSE_DEV) rm -fv
#	screen -

config:
	$(DOCKER_COMPOSE_DEV) config

upgrade:
	$(DOCKER_COMPOSE_DEV) pull
	$(DOCKER_COMPOSE_DEV) up -d

logs-activitypods:
	$(DOCKER_COMPOSE_DEV) logs activitypods-backend

attach-activitypods:
	$(DOCKER_COMPOSE_DEV) exec activitypods-backend pm2 attach 0

# Prod commands

build-prod:
	$(DOCKER_COMPOSE_PROD) build

start-prod:
	$(DOCKER_COMPOSE_PROD) up -d
	$(DOCKER_COMPOSE_DEV) up -d

start-prod-only:
	$(DOCKER_COMPOSE_PROD) up -d

stop-prod:
	$(DOCKER_COMPOSE_PROD) kill
	$(DOCKER_COMPOSE_PROD) rm -fv
	$(DOCKER_COMPOSE_DEV) kill
	$(DOCKER_COMPOSE_DEV) rm -fv

stop-prod-only:
	$(DOCKER_COMPOSE_PROD) kill
	$(DOCKER_COMPOSE_PROD) rm -fv

config-prod:
	$(DOCKER_COMPOSE_PROD) config

upgrade-prod:
	$(DOCKER_COMPOSE_PROD) pull
	$(DOCKER_COMPOSE_PROD) up -d

attach-backend-prod:
	$(DOCKER_COMPOSE_PROD) exec backend pm2 attach 0

# Publish commands

publish-frontend:
	export TAG=`git describe --tags --abbrev=0`
	$(DOCKER_COMPOSE_PROD) build app-frontend
	$(DOCKER_COMPOSE_PROD) push app-frontend

publish-backend:
	export TAG=`git describe --tags --abbrev=0`
	$(DOCKER_COMPOSE_PROD) build app-backend
	$(DOCKER_COMPOSE_PROD) push app-backend

publish-frontend-latest:
	export TAG=latest
	$(DOCKER_COMPOSE_PROD) build app-frontend
	$(DOCKER_COMPOSE_PROD) push app-frontend

publish-backend-latest:
	export TAG=latest
	$(DOCKER_COMPOSE_PROD) build app-backend
	$(DOCKER_COMPOSE_PROD) push app-backend

# ---------------------------------------------------------------------------
# Database helpers
# Requires the dev containers (make start) to be running so the 'pg' service
# is accepting connections on localhost:5432.
# ---------------------------------------------------------------------------

# Push schema changes directly to the dev DB (fast, for local development).
# Equivalent to: "apply whatever the Drizzle schema files describe right now".
db-push:
	cd api && DB_URL=postgres://postgres:$(POSTGRES_PASSWORD)@localhost:5432/postgres bun run drizzle:push

# Generate a checked-in Drizzle migration SQL file from the current schema.
# Commit the generated file in api/drizzle/ before deploying to production.
db-generate:
	cd api && bun run drizzle:generate

# Apply all pending checked-in migration files (use in CI / production).
db-migrate:
	cd api && DB_URL=postgres://postgres:$(POSTGRES_PASSWORD)@localhost:5432/postgres bun run drizzle:migrate
