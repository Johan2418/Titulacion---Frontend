# RNF-26: despliegue mediante contenedores
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Variables de compilación (Vite las incrusta en el bundle)
ARG VITE_API_URL=/api/v1
ARG VITE_TIMEZONE=America/Guayaquil
ENV VITE_API_URL=$VITE_API_URL VITE_TIMEZONE=$VITE_TIMEZONE
RUN npm run build

FROM nginx:1.27-alpine
# La imagen de Nginx sustituye ${BACKEND_URL} al iniciar (plantillas en /etc/nginx/templates)
ENV BACKEND_URL=http://backend:3000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/healthz || exit 1
