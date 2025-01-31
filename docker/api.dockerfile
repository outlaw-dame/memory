FROM oven/bun:1.2-debian AS base

WORKDIR /app/api

COPY /api/package.json /api/bun.lock /api/.env /app/api

RUN bun install --global pm2
RUN bun install
RUN bun drizzle:push

ADD api /app/api
RUN bun build \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile ./dist/index.js \
	./src/index.ts

CMD [ "pm2-runtime", "start", "/app/api/pm2.config.js" ] 
