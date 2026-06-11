#!/bin/bash
## ── Bootstrap Let's Encrypt SSL for the Dockerized nginx ──────────────────────
## Run ONCE after DNS points app.xplosale.com -> this server.
## It creates a temporary self-signed cert so nginx can boot, then swaps in a
## real Let's Encrypt cert via the HTTP-01 (webroot) challenge.
##
##   bash init-letsencrypt.sh
##
## Re-running is safe (it force-renews the cert).
set -e

domain="app.xplosale.com"
email="mubashir.ibstec@gmail.com"   # used by Let's Encrypt for expiry notices
staging=0                            # set to 1 while testing to dodge rate limits

compose="docker compose"
cert_path="/etc/letsencrypt/live/$domain"

echo "### (1/5) Downloading recommended TLS parameters ..."
$compose run --rm --entrypoint "\
  sh -c 'mkdir -p /etc/letsencrypt && \
    wget -qO /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf && \
    wget -qO /etc/letsencrypt/ssl-dhparams.pem https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem'" certbot

echo "### (2/5) Creating a temporary self-signed certificate ..."
$compose run --rm --entrypoint "\
  sh -c 'mkdir -p $cert_path && \
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout $cert_path/privkey.pem \
      -out $cert_path/fullchain.pem \
      -subj /CN=localhost'" certbot

echo "### (3/5) Starting nginx with the temporary certificate ..."
$compose up -d nginx

echo "### (4/5) Removing the temporary certificate ..."
$compose run --rm --entrypoint "\
  sh -c 'rm -rf /etc/letsencrypt/live/$domain \
    /etc/letsencrypt/archive/$domain \
    /etc/letsencrypt/renewal/$domain.conf'" certbot

echo "### (5/5) Requesting the real Let's Encrypt certificate ..."
staging_arg=""
if [ "$staging" != "0" ]; then staging_arg="--staging"; fi

$compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    -d $domain \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "### Reloading nginx with the real certificate ..."
$compose exec nginx nginx -s reload

echo ""
echo "### Done. https://$domain is now live with a valid certificate."
