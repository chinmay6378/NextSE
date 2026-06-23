#!/bin/bash
# Run this ONCE on the VPS after the HTTP-only services are up.
# Replace yourdomain.com and your@email.com before running.

DOMAIN="yourdomain.com"
EMAIL="your@email.com"

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo ""
echo "Certificate obtained. Now:"
echo "  1. cp nginx/nginx.conf nginx/nginx-http-only.conf  (keep backup)"
echo "  2. Replace nginx/nginx.conf with the HTTPS version"
echo "  3. docker compose restart nginx"
