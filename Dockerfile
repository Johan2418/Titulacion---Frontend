# RNF-26: despliegue mediante contenedores
# Imágenes fijadas por digest (resuelto con `docker buildx imagetools inspect`); actualizar con Dependabot/renovación manual.
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Variables de compilación (Vite las incrusta en el bundle)
ARG VITE_API_URL=/api/v1
ARG VITE_TIMEZONE=America/Guayaquil
# Orígenes permitidos para descargas prefirmadas (separados por coma); vacío = cualquier https
ARG VITE_STORAGE_ORIGINS=
ENV VITE_API_URL=$VITE_API_URL VITE_TIMEZONE=$VITE_TIMEZONE VITE_STORAGE_ORIGINS=$VITE_STORAGE_ORIGINS
RUN npm run build
# Los scripts y snippets de nginx deben usar LF aunque se hayan extraído con CRLF (Windows)
RUN sed -i 's/\r$//' nginx/25-real-ip.sh nginx/security-headers.conf nginx/proxy-api.conf nginx.conf

# Sin privilegios: corre como usuario `nginx` (no root) y escucha en 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0
# La imagen sustituye ${BACKEND_URL} al iniciar (plantillas en /etc/nginx/templates)
ENV BACKEND_URL=http://backend:3000
# IP real del cliente detrás de un balanceador de confianza (vacío: exposición directa)
ENV TRUSTED_PROXY_CIDR=
# Límites por IP (holgados: varios usuarios pueden compartir IP por NAT); ver nginx.conf
ENV RATE_LIMIT_AUTH=20r/s RATE_LIMIT_AUTH_BURST=40 RATE_LIMIT_API=100r/s RATE_LIMIT_API_BURST=200 LIMIT_CONN_PER_IP=100 LIMIT_CONN_UPLOAD_PER_IP=10
COPY --from=build /app/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/nginx/security-headers.conf /app/nginx/proxy-api.conf /etc/nginx/snippets/
COPY --from=build --chmod=755 /app/nginx/25-real-ip.sh /docker-entrypoint.d/25-real-ip.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/healthz || exit 1
