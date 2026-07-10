FROM node:22.17.1-alpine AS build
WORKDIR /app
ARG VITE_APOLLO_API_URL=/api/v1
ENV VITE_APOLLO_API_URL=$VITE_APOLLO_API_URL
COPY package.json package-lock.json ./
COPY vendor/apollo-desktop ./vendor/apollo-desktop
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/frontend-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
