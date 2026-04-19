#!/usr/bin/env bash
# DestinationPacker — Frontend Setup Script (macOS)
# Run this once on your Mac to set up the React Native / Expo dev environment.
# Edit the CONFIGURATION section before running.
set -euo pipefail

# --- CONFIGURATION --- edit these before running ------------------------------
# Your VPS server IP or domain (from setup-backend.sh output)
BACKEND_IP='PLACEHOLDER_your_vps_ip_or_domain'   # e.g. 192.168.1.100 or api.myapp.com
BACKEND_PORT='8000'
# ------------------------------------------------------------------------------

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*" >&2; exit 1; }

# Guard
if [[ "$BACKEND_IP" == "PLACEHOLDER_your_vps_ip_or_domain" ]]; then
  die "Edit BACKEND_IP at the top of this script before running."
fi

# macOS only
if [[ "$(uname)" != "Darwin" ]]; then
  die "This script is for macOS only. Use setup-backend.sh for Ubuntu VPS."
fi

echo ""
echo "=============================================="
echo "   DestinationPacker -- Frontend Setup (Mac)"
echo "=============================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$APP_DIR/mobile"

# ── 1. Xcode Command Line Tools ───────────────────────────────────────────────
if xcode-select -p &>/dev/null; then
  success "Xcode Command Line Tools already installed"
else
  info "Installing Xcode Command Line Tools (follow the prompt)..."
  xcode-select --install
  echo "  After the installer finishes, re-run this script."
  exit 0
fi

# ── 2. Homebrew ───────────────────────────────────────────────────────────────
if command -v brew &>/dev/null; then
  success "Homebrew already installed ($(brew --version | head -1))"
else
  info "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for Apple Silicon
  if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
fi

# ── 3. Node.js via nvm ────────────────────────────────────────────────────────
NODE_TARGET="20"

if command -v nvm &>/dev/null || [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  success "nvm already installed"
else
  info "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# Load nvm for this session
export NVM_DIR="$HOME/.nvm"
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
[[ -s "$NVM_DIR/bash_completion" ]] && source "$NVM_DIR/bash_completion"

if ! command -v nvm &>/dev/null; then
  die "nvm not found after install. Close this terminal, open a new one, and re-run."
fi

CURRENT_NODE=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [[ "$CURRENT_NODE" -ge "$NODE_TARGET" ]]; then
  success "Node.js $(node --version) already installed"
else
  info "Installing Node.js $NODE_TARGET via nvm..."
  nvm install "$NODE_TARGET"
  nvm use "$NODE_TARGET"
  nvm alias default "$NODE_TARGET"
fi
success "Using Node.js $(node --version)"

# ── 4. Watchman (required for Metro bundler) ──────────────────────────────────
if command -v watchman &>/dev/null; then
  success "Watchman already installed"
else
  info "Installing Watchman..."
  brew install watchman
fi

# ── 5. Expo CLI ───────────────────────────────────────────────────────────────
if command -v expo &>/dev/null; then
  success "Expo CLI already installed"
else
  info "Installing Expo CLI..."
  npm install -g expo-cli @expo/cli
fi

# ── 6. EAS CLI (for building release APK/IPA later) ──────────────────────────
if command -v eas &>/dev/null; then
  success "EAS CLI already installed"
else
  info "Installing EAS CLI..."
  npm install -g eas-cli
fi

# ── 7. npm install ────────────────────────────────────────────────────────────
if [[ ! -d "$MOBILE_DIR" ]]; then
  die "Mobile directory not found at $MOBILE_DIR. Make sure you cloned the full repo."
fi

info "Installing npm dependencies..."
cd "$MOBILE_DIR"
npm install
success "npm dependencies installed"

# ── 8. Update API URL in config ───────────────────────────────────────────────
CONFIG_FILE="$MOBILE_DIR/constants/config.ts"
API_URL="http://${BACKEND_IP}:${BACKEND_PORT}/api"

if [[ ! -f "$CONFIG_FILE" ]]; then
  die "Config file not found: $CONFIG_FILE"
fi

if grep -q "destinationpacker.app" "$CONFIG_FILE"; then
  info "Updating production API URL in config.ts to $API_URL..."
  # Use perl for in-place replace (BSD sed on macOS doesn't support -i without suffix reliably)
  perl -i -pe "s|https://api\.destinationpacker\.app/api|${API_URL}|g" "$CONFIG_FILE"
  success "Updated config.ts: production API URL → $API_URL"
else
  warn "config.ts already has a custom API URL — not overwriting. Check manually:"
  warn "  $CONFIG_FILE"
fi

# ── 9. Verify backend connection ──────────────────────────────────────────────
info "Testing backend connection..."
if curl -sf --max-time 5 "http://${BACKEND_IP}:${BACKEND_PORT}/health" > /dev/null 2>&1; then
  success "Backend is reachable at http://${BACKEND_IP}:${BACKEND_PORT}"
else
  warn "Cannot reach backend at http://${BACKEND_IP}:${BACKEND_PORT}/health"
  warn "Make sure the backend is running and the firewall allows port $BACKEND_PORT."
  warn "Continue anyway — you can fix the connection later."
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "   Setup complete!"
echo "=============================================="
echo ""
echo "  Start the dev server:"
echo "    cd mobile && npx expo start"
echo ""
echo "  Scan the QR code with Expo Go on your phone, or:"
echo "    Press 'i' for iOS Simulator (requires Xcode)"
echo "    Press 'a' for Android emulator (requires Android Studio)"
echo ""
echo "  API URL configured: http://${BACKEND_IP}:${BACKEND_PORT}/api"
echo "    (also update the 'development' URL in config.ts if testing locally)"
echo ""
echo "  Before building for release:"
echo "    eas build --platform ios"
echo "    eas build --platform android"
echo ""
