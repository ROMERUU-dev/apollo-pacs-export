FROM node:22.17.1-alpine@sha256:5539840ce9d013fa13e3b9814c9353024be7ac75aca5db6d039504a56c04ea59 AS build
WORKDIR /app
ARG VITE_APOLLO_API_URL=/api/v1
ENV VITE_APOLLO_API_URL=$VITE_APOLLO_API_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/frontend-nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/nginx.conf /etc/nginx/nginx.conf
USER 101:101
EXPOSE 8080
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
