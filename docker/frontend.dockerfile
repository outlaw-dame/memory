FROM node:20-alpine
WORKDIR /app/frontend

ARG VITE_API_URL
ARG VITE_POD_PROVIDER_BASE_URL=http://localhost:3000
ARG BACKEND_URL=http://api:8794
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_POD_PROVIDER_BASE_URL=${VITE_POD_PROVIDER_BASE_URL}
ENV BACKEND_URL=${BACKEND_URL}

# Install packages first so that Docker doesn't run `yarn install` if the packages haven't changed
# See https://making.close.com/posts/reduce-docker-image-size
COPY frontend/package.json frontend/package-lock.json /app/frontend/
RUN npm install

ADD frontend /app/frontend

# install api dependencies
ADD api /app/api
WORKDIR /app/api
RUN npm install
WORKDIR /app/frontend

RUN npm run build

EXPOSE 4000
CMD ["node", "server.mjs"]
