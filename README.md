# Memory

A Microblog-App that saves all data on your Pod.

Built on the [ActivityPods](https://activitypods.org) framework.

## Running the app

- Clone the repo `git clone https://github.com/activitypods/memory.git`
- go into the directory `cd memory`
- run `make start-prod` to start the app
- open the browser at `http://localhost:4000`

Note that the app is currently only optimized for mobile devices. so to use it on a desktop browser, you need to use dev tools.
- [Firefox](https://firefox-source-docs.mozilla.org/devtools-user/responsive_design_mode/)
- [Chrome](https://developer.chrome.com/docs/devtools/device-mode/)

Currently optimised mobile devices are:
- iPhone 11 Pro (375x812)

## Development

### Prerequisites

- [Docker](https://docs.docker.com/desktop/)
- [Bun](https://bun.sh/)

### Running the app

- Clone the repo `git clone https://github.com/activitypods/memory.git`
- go into the directory `cd memory`
  - if you use VsCode or VsCodium, you can install the recommended extensions for development for a better development experience
- run `make start` to start the PodProvider
- run `bun install` to install prettier for code formatting (if there is a better way to do this, please let me know)


#### Running the api
- go into the directory `cd api`
- run `bun install` to install the dependencies
- run `bun dev` to start the api

#### Running the frontend
- go into the directory `cd frontend`
- run `bun install` to install the dependencies
- run `bun dev` to start the frontend

### Commands

`make start` Starts the activitypods provider using a docker-compose file. This includes the activitypods backend, the fuskie db and a postgresql database for the api. 

`make stop` Stops and removes all containers for the activitypods provider.

`make config` Prints the config with the `.env`-file-provided environment variables filled.

`make logs-activitypods` Prints the activitypods provider logs.

`make attach-activitypods` Attaches to the [moleculer](https://moleculer.services/) repl of the activitypods backend.