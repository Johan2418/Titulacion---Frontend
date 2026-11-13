#!/bin/sh
# IP real del cliente detrás de un balanceador que termina TLS.
# TRUSTED_PROXY_CIDR: CIDR(s) del balanceador, separados por coma (p. ej. "10.0.0.0/8,fd00::/8").
# Vacío (por defecto, exposición directa): no se emite set_real_ip_from y $remote_addr es el cliente.
# Se ejecuta como parte del entrypoint de la imagen (antes de iniciar nginx) y escribe un archivo
# que conf.d/*.conf incluye en el contexto http.
set -eu

destino=/etc/nginx/conf.d/00-real-ip.conf
cidrs="${TRUSTED_PROXY_CIDR:-}"

: > "$destino"
[ -n "$cidrs" ] || exit 0

{
  echo "# generado por 25-real-ip.sh"
  old_ifs=$IFS
  IFS=','
  for cidr in $cidrs; do
    cidr=$(printf '%s' "$cidr" | tr -d ' ')
    [ -n "$cidr" ] || continue
    # solo caracteres de una dirección/CIDR: evita inyectar directivas en la configuración
    case "$cidr" in
      *[!0-9a-fA-F:./]*) echo "TRUSTED_PROXY_CIDR inválido: $cidr" >&2; exit 1 ;;
    esac
    echo "set_real_ip_from $cidr;"
  done
  IFS=$old_ifs
  echo "real_ip_header X-Forwarded-For;"
  echo "real_ip_recursive on;"
} > "$destino"
