.DEFAULT_GOAL := help
.PHONY: docker-build docker-up build start log stop restart

DOCKER_COMPOSE_DEV=docker compose -f docker-compose-dev.yml  --env-file .env --env-file .env.local
DOCKER_COMPOSE_ZROK=docker compose -f docker-compose-zrok.yml  --env-file .env.zrok --env-file .env.zrok.local
DOCKER_COMPOSE_PROD=docker compose -f docker-compose-prod.yml --env-file .env.production --env-file .env.production.local


# Redpanda/Opensearch docker commands
# dev only for the time being
RP_OS_DOCKER_COMPOSE_DEV=docker compose -f ./docker/redpanda-opensearch/docker-compose.yml --env-file ./docker/redpanda-opensearch/.env


# Mastopod/Memory start commands
MEM_START=screen -dmS memory-backend bash -c 'cd backend; yarn run dev' && screen -dmS memory-frontend bash -c 'cd frontend; yarn run dev' 
MEM_STOP=screen -XS memory-backend quit && screen -XS memory-frontend quit


# Dev commands

# Start relevant docker containers and run frontend and backend in separate screen
start:
	$(DOCKER_COMPOSE_DEV) up -d
	$(RP_OS_DOCKER_COMPOSE_DEV) up -d
#	$(MEM_START)

stop:
	$(DOCKER_COMPOSE_DEV) kill
	$(DOCKER_COMPOSE_DEV) rm -fv
	$(RP_OS_DOCKER_COMPOSE_DEV) kill
	$(RP_OS_DOCKER_COMPOSE_DEV) rm -fv
#	$(MEM_STOP)

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

stop-prod:
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
