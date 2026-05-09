#!/usr/bin/env bash
# DestinationPacker - Backend Setup Script (Ubuntu VPS)
# Run this once on a fresh Ubuntu 22.04+ server.
# Edit the PLACEHOLDER values below before running.
set -euo pipefail

# --- CONFIGURATION --- edit these before running ------------------------------
# IMPORTANT: Use SINGLE quotes for passwords/keys to avoid issues with
# special characters like $, !, #, etc.
DB_PASSWORD='PLACEHOLDER_db_password'          # Strong password for PostgreSQL
SECRET_KEY='PLACEHOLDER_secret_key_64chars'    # Run: openssl rand -hex 32
DOMAIN='PLACEHOLDER_domain'                    # e.g. api.yourdomain.com — used for nginx + TLS
OPENROUTER_API_KEY=''                          # Optional: free AI models via openrouter.ai
ANTHROPIC_API_KEY=''                           # Optional: Claude AI fallback
SMTP_HOST=''                                   # Optional: e.g. smtp.gmail.com
SMTP_USER=''                                   # Optional: your email address
SMTP_PASSWORD=''                               # Optional: app password
REPO_URL='https://github.com/mikepitts25/DestinationPacker.git'
APP_DIR="$HOME/DestinationPacker"
OLLAMA_MODEL='llama3.1:8b'
SETUP_NGINX=true                               # Set false to skip nginx/TLS setup
# ------------------------------------------------------------------------------

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

# Guard against unedited placeholders
if [[ "$DB_PASSWORD" == "PLACEHOLDER_db_password" || \
      "$SECRET_KEY" == "PLACEHOLDER_secret_key_64chars" || \
      "$DOMAIN" == "PLACEHOLDER_domain" ]]; then
  die "Edit the CONFIGURATION section at the top of this script before running."
fi

echo ""
echo "=============================================="
echo "   DestinationPacker -- Backend Setup"
echo "=============================================="
echo ""

# -- 1. System packages --------------------------------------------------------
info "Updating apt..."
sudo apt-get update -qq

install_pkg() {
  if dpkg -s "$1" &>/dev/null; then
    success "$1 already installed"
  else
    info "Installing $1..."
    sudo apt-get install -y -qq "$1"
  fi
}

for pkg in curl wget git build-essential ca-certificates gnupg lsb-release software-properties-common; do
  install_pkg "$pkg"
done

# -- 2. Python 3.12 ------------------------------------------------------------
if command -v python3.12 &>/dev/null; then
  success "Python 3.12 already installed ($(python3.12 --version))"
else
  info "Adding deadsnakes PPA for Python 3.12..."
  sudo add-apt-repository -y ppa:deadsnakes/ppa
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3.12
fi

install_pkg python3.12-venv
install_pkg python3.12-dev

# -- 3. Docker -----------------------------------------------------------------
if command -v docker &>/dev/null; then
  success "Docker already installed ($(docker --version))"
else
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sudo bash
  sudo usermod -aG docker "$USER"
  warn "You have been added to the 'docker' group. Log out and back in, then re-run this script."
  warn "Or run: newgrp docker"
fi

if ! docker info &>/dev/null 2>&1; then
  # Try newgrp trick
  if groups | grep -q docker; then
    die "Docker daemon not accessible. Try: newgrp docker, then re-run."
  else
    die "Docker not accessible. Log out and back in to apply group membership, then re-run."
  fi
fi

if command -v docker-compose &>/dev/null || docker compose version &>/dev/null 2>&1; then
  success "Docker Compose available"
else
  info "Installing Docker Compose plugin..."
  sudo apt-get install -y -qq docker-compose-plugin
fi

# -- 4. Ollama -----------------------------------------------------------------
if command -v ollama &>/dev/null; then
  success "Ollama already installed ($(ollama --version 2>/dev/null || echo 'version unknown'))"
else
  info "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

if ! systemctl is-active --quiet ollama 2>/dev/null; then
  info "Starting Ollama service..."
  sudo systemctl enable ollama
  sudo systemctl start ollama
  sleep 3
fi
success "Ollama running"

# Pull model if not already present
if ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL%%:*}"; then
  success "Ollama model $OLLAMA_MODEL already pulled"
else
  info "Pulling Ollama model $OLLAMA_MODEL (this may take a few minutes)..."
  ollama pull "$OLLAMA_MODEL"
fi

# -- 5. Clone / update repo ----------------------------------------------------
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo already cloned -- pulling latest changes..."
  git -C "$APP_DIR" pull
else
  info "Cloning repository to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# -- 6. Python virtual environment ---------------------------------------------
VENV="$APP_DIR/backend/venv"
if [[ -d "$VENV" ]]; then
  success "Python venv already exists"
else
  info "Creating Python virtual environment..."
  python3.12 -m venv "$VENV"
fi

info "Installing Python dependencies..."
"$VENV/bin/python" -m pip install --upgrade pip -q
"$VENV/bin/python" -m pip install -r "$APP_DIR/backend/requirements.txt" -q
success "Python dependencies installed"

# -- 7. .env file --------------------------------------------------------------
ENV_FILE="$APP_DIR/backend/.env"
if [[ -f "$ENV_FILE" ]]; then
  success ".env already exists -- not overwriting"
else
  info "Creating .env from template..."
  {
    printf 'DATABASE_URL=postgresql+asyncpg://packer:%s@localhost:5432/destinationpacker\n' "$DB_PASSWORD"
    printf 'REDIS_URL=redis://localhost:6379\n'
    printf 'SECRET_KEY=%s\n' "$SECRET_KEY"
    printf '\n'
    printf 'OLLAMA_BASE_URL=http://localhost:11434\n'
    printf 'OLLAMA_MODEL=%s\n' "$OLLAMA_MODEL"
    printf '\n'
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
      printf 'ANTHROPIC_API_KEY=%s\n' "$ANTHROPIC_API_KEY"
    else
      printf '# ANTHROPIC_API_KEY=\n'
    fi
    printf '\n'
    printf 'ENVIRONMENT=production\n'
    printf 'ALLOWED_ORIGINS=https://%s\n' "$DOMAIN"
    printf '\n'
    if [[ -n "$OPENROUTER_API_KEY" ]]; then
      printf 'OPENROUTER_API_KEY=%s\n' "$OPENROUTER_API_KEY"
      printf 'OPENROUTER_MODELS=google/gemma-4-26b-a4b-it:free,minimax/minimax-m2.5:free,meta-llama/llama-3.3-70b-instruct:free\n'
    fi
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
      printf 'ANTHROPIC_API_KEY=%s\n' "$ANTHROPIC_API_KEY"
    fi
    if [[ -n "$SMTP_HOST" ]]; then
      printf 'SMTP_HOST=%s\n' "$SMTP_HOST"
      printf 'SMTP_PORT=587\n'
      printf 'SMTP_USER=%s\n' "$SMTP_USER"
      printf 'SMTP_PASSWORD=%s\n' "$SMTP_PASSWORD"
    fi
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  success ".env created at $ENV_FILE"
fi

# -- 8. Docker services (Postgres + Valkey) ------------------------------------
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

# Patch DB password into compose file to match .env
if grep -q 'POSTGRES_PASSWORD: packer_secret' "$COMPOSE_FILE" 2>/dev/null; then
  info "Updating docker-compose.yml with your DB password..."
  sed -i "s/POSTGRES_PASSWORD: packer_secret/POSTGRES_PASSWORD: ${DB_PASSWORD//\//\\/}/" "$COMPOSE_FILE"
  sed -i "s|packer:packer_secret@|packer:${DB_PASSWORD}@|g" "$COMPOSE_FILE"
fi

info "Starting Docker services (Postgres + Valkey)..."
docker compose -f "$COMPOSE_FILE" up -d db valkey
info "Waiting for Postgres to be ready..."
for i in $(seq 1 20); do
  if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U packer &>/dev/null; then
    success "Postgres ready"
    break
  fi
  sleep 2
  if [[ $i -eq 20 ]]; then
    die "Postgres did not become ready in time. Check: docker compose logs db"
  fi
done

# -- 9. Alembic migrations -----------------------------------------------------
info "Running database migrations..."
cd "$APP_DIR/backend"
"$VENV/bin/alembic" upgrade head
success "Database migrations applied"

# -- 10. Nginx + TLS (Let's Encrypt) ------------------------------------------
if [[ "$SETUP_NGINX" == "true" ]]; then
  install_pkg nginx
  install_pkg certbot
  sudo mkdir -p /var/www/certbot

  NGINX_CONF="/etc/nginx/sites-available/destinationpacker"

  install_bootstrap_nginx_conf() {
    info "Installing temporary HTTP nginx config for certificate issuance..."
    sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "DestinationPacker certificate bootstrap\n";
        add_header Content-Type text/plain;
    }
}
EOF
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/destinationpacker
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
  }

  install_final_nginx_conf() {
    info "Installing final HTTPS nginx config..."
    sudo cp "$APP_DIR/nginx/destinationpacker.conf" "$NGINX_CONF"
    sudo sed -i "s/api.yourdomain.com/${DOMAIN}/g" "$NGINX_CONF"
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/destinationpacker
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    success "Nginx configured for $DOMAIN"
  }

  # Obtain TLS certificate if not already present
  if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
    info "Obtaining TLS certificate for $DOMAIN..."
    info "(Make sure $DOMAIN points to this server's IP before continuing)"
    install_bootstrap_nginx_conf
    sudo certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
      --non-interactive --agree-tos --email "admin@${DOMAIN#*.}" || \
      warn "Certbot failed — run manually: sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN"
  else
    success "TLS certificate already exists for $DOMAIN"
  fi

  if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
    install_final_nginx_conf
  else
    warn "Leaving temporary HTTP nginx config in place because TLS certificate is missing."
  fi

  # Auto-renew via cron
  if ! crontab -l 2>/dev/null | grep -q certbot; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -
    success "Certbot auto-renewal cron added"
  fi
fi

# -- 12. Systemd service for the API -------------------------------------------
SERVICE_FILE="/etc/systemd/system/destinationpacker.service"
if [[ -f "$SERVICE_FILE" ]]; then
  success "Systemd service already exists"
else
  info "Creating systemd service..."
  sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=DestinationPacker API
After=network.target docker.service ollama.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$VENV/bin:/usr/local/bin:/usr/bin:/bin
ExecStartPre=$VENV/bin/alembic upgrade head
ExecStart=$VENV/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable destinationpacker
  success "Systemd service created"
fi

info "Starting API service..."
sudo systemctl restart destinationpacker
sleep 3

if systemctl is-active --quiet destinationpacker; then
  success "API service is running"
else
  warn "API service may not have started. Check: sudo journalctl -u destinationpacker -n 50"
fi

# -- Done ----------------------------------------------------------------------
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo ""
echo "=============================================="
echo "   Setup complete!"
echo "=============================================="
echo ""
if [[ "$SETUP_NGINX" == "true" ]]; then
  echo "  API running at:  https://${DOMAIN}"
  echo "  Health check:    curl https://${DOMAIN}/health"
else
  echo "  API running at:  http://${SERVER_IP}:8000"
  echo "  Health check:    curl http://${SERVER_IP}:8000/health"
  echo "  API docs:        http://${SERVER_IP}:8000/docs"
fi
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status destinationpacker"
echo "    sudo journalctl -u destinationpacker -f"
echo "    docker compose -f $COMPOSE_FILE logs -f"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  Next: update mobile/constants/config.ts with:"
if [[ "$SETUP_NGINX" == "true" ]]; then
  echo "    API_URL: 'https://${DOMAIN}/api'"
else
  echo "    API_URL: 'http://${SERVER_IP}:8000/api'"
fi
echo ""
