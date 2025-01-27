FROM node:20-alpine
WORKDIR /app/frontend

RUN npm install -g serve

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

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
CMD serve -s dist -l 4000
